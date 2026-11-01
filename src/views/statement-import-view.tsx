import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ScreenView, ThemedText } from '@/src/components/core';
import { Pressable } from '@/src/components/core/interactive';
import { useDataContext } from '@/src/state/DataProvider';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { readStatement, MAX_STATEMENT_BYTES } from '@/src/helpers/StatementReader';
import { releaseStatementFile, statementFileSize } from '@/src/helpers/StatementFiles';
import { statementAmount, statementDate, statementDay, suggestStatementAccount } from '@/src/helpers/StatementParser';
import { reconcileStatement, type ReviewRow } from '@/src/helpers/StatementReconciliation';
import { fetchStatementTransactions, restoreStatementLinks, saveStatementImport } from '@/src/helpers/StatementImportService';
import type { Transaction } from '@/src/types/models';

type DraftRow = ReviewRow & { amountInput: string };

export default function StatementImportView({ spreadsheetId }: { spreadsheetId: string | null }) {
  const { accounts, reloadData } = useDataContext();
  const color = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [account, setAccount] = useState('');
  const [confirmedAccount, setConfirmedAccount] = useState(false);
  const [existing, setExisting] = useState<Transaction[] | null>(null);
  const [busy, setBusy] = useState<'read' | 'save' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const job = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => job.current?.abort(), []);

  const reconciled = useMemo(() => reconcileStatement(rows, existing || [], account), [rows, existing, account]);
  const pending = reconciled.filter(r => r.status === 'review').length;
  const missing = reconciled.filter(r => r.status === 'missing').length;
  const linked = reconciled.filter(r => r.status === 'matched').length;
  const dates = rows.map(r => r.date).filter(d => statementDate(d)).sort((a, b) => statementDay(a) - statementDay(b));
  const disabled = !!busy || done;
  const canSave = !disabled && !!spreadsheetId && confirmedAccount &&
    accounts.some(a => a.name === account) && existing !== null && pending === 0 && missing + linked > 0;

  const update = (id: string, changes: Partial<DraftRow>) => {
    setRows(old => old.map(row => row.id === id ? { ...row, decision: 'auto', ...changes } : row));
  };

  const button = (label: string, onPress: () => void, blocked = disabled, selected = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, selected }} disabled={blocked}
      onPress={onPress} style={[styles.button, { borderColor: color }, selected && styles.selected, blocked && styles.disabled]}>
      <ThemedText>{label}</ThemedText>
    </Pressable>
  );

  async function acquire(source: 'file' | 'camera' | 'gallery') {
    if (job.current || !spreadsheetId) return;
    const controller = new AbortController();
    job.current = controller;
    setBusy('read'); setError(''); setMessage('Selezione documento...');
    const owned: string[] = [];
    try {
      let assets: { uri: string; mimeType?: string; name?: string; size?: number }[] = [];
      if (source === 'file') {
        const picked = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, base64: false,
        });
        if (picked.canceled) return;
        assets = picked.assets;
      } else {
        if (source === 'camera' && Platform.OS !== 'web') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) throw new Error('Accesso alla fotocamera negato. Abilitarlo nelle impostazioni o scegliere un file.');
        }
        const picked = source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: true, selectionLimit: 30 });
        if (picked.canceled) return;
        assets = picked.assets.map(a => ({ uri: a.uri, mimeType: a.mimeType, size: a.fileSize }));
      }
      owned.push(...assets.map(a => a.uri));
      controller.signal.throwIfAborted();
      if (assets.length > 30) throw new Error('Selezionare al massimo 30 immagini alla volta.');
      const draft: DraftRow[] = source === 'file' ? [] : [...rows];
      const notices: string[] = source === 'file' ? [] : [...warnings];
      let suggestion = '';
      for (const asset of assets) {
        if ((asset.size ?? await statementFileSize(asset.uri)) > MAX_STATEMENT_BYTES) {
          throw new Error('Documento troppo grande: massimo 25 MB.');
        }
        const pdf = asset.mimeType === 'application/pdf' || /\.pdf$/i.test(asset.name || asset.uri);
        const data = await readStatement(asset.uri, pdf, setMessage, controller.signal);
        const prefix = ++sequence.current;
        draft.push(...data.transactions.map(row => ({ ...row, id: `${prefix}:${row.id}`,
          amountInput: row.amount.toFixed(2).replace('.', ','), decision: 'auto' as const })));
        notices.push(...data.warnings.map(w => `Documento ${prefix}: ${w}`));
        suggestion ||= suggestStatementAccount(data.accountName, accounts);
      }
      controller.signal.throwIfAborted();
      setRows(draft); setWarnings(notices); setExisting(null); setConfirmedAccount(false);
      if (source === 'file' || !account) setAccount(suggestion);
      setMessage('Verificare tutte le righe e confermare il conto. Nessun dato salvato.');
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Lettura non riuscita.');
    } finally {
      for (const uri of owned) {
        try { releaseStatementFile(uri); } catch {
          setError('Impossibile eliminare una copia temporanea. Chiudere l’app e svuotare la cache prima di condividere il dispositivo.');
        }
      }
      if (job.current === controller) { job.current = null; setBusy(null); }
    }
  }

  async function refresh() {
    if (!spreadsheetId || !account || job.current) return;
    const controller = new AbortController();
    job.current = controller; setBusy('read'); setError(''); setExisting(null);
    setMessage('Caricamento transazioni per la riconciliazione locale...');
    try {
      const data = await fetchStatementTransactions(spreadsheetId);
      const restored = await restoreStatementLinks(spreadsheetId, account, rows, data);
      controller.signal.throwIfAborted();
      setRows(old => restored.map((row, i) => ({ ...row, amountInput: old[i].amountInput })));
      setExisting(data); setConfirmedAccount(true);
      setMessage('Riconciliazione aggiornata. Controllare date, importi, direzioni e collegamenti.');
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Riconciliazione non disponibile.');
    } finally {
      job.current = null; setBusy(null);
    }
  }

  async function save() {
    if (!canSave || !spreadsheetId || job.current) return;
    const controller = new AbortController();
    job.current = controller; setBusy('save'); setError('');
    setMessage('Verifica finale prima del salvataggio...');
    try {
      const result = await saveStatementImport(spreadsheetId, account, reconciled, (saved, matched) => {
        setMessage(`${saved} nuovi salvati, ${matched} collegati. Non chiudere durante il salvataggio.`);
      }, controller.signal);
      setMessage(`Importazione completata: ${result.saved} nuovi movimenti, ${result.linked} collegati senza duplicarli.`);
      setDone(true);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : 'Importazione interrotta. Verificare i movimenti salvati.');
        setExisting(null);
      }
    } finally {
      job.current = null; setBusy(null);
      await reloadData();
    }
  }

  return (
    <ScreenView>
      <View style={styles.container}>
        <View style={styles.actions}>
          {button('Chiudi', () => { job.current?.abort(); router.back(); }, busy === 'save')}
          <ThemedText type="title">Importa estratto conto</ThemedText>
        </View>
        <ThemedText>PDF e foto sono letti sul dispositivo. Solo i movimenti approvati vengono salvati tramite API. Valuta supportata: EUR.</ThemedText>
        {!spreadsheetId && <ThemedText accessibilityRole="alert">Selezionare prima un foglio di lavoro.</ThemedText>}
        <View style={styles.actions}>
          {button('PDF / immagine (nuovo estratto)', () => void acquire('file'), disabled || !spreadsheetId)}
          {button('Scatta foto / aggiungi pagina', () => void acquire('camera'), disabled || !spreadsheetId)}
          {button('Foto dalla galleria', () => void acquire('gallery'), disabled || !spreadsheetId)}
        </View>
        {!!busy && <ActivityIndicator accessibilityLabel="Elaborazione in corso" />}
        {!!message && <ThemedText accessibilityLiveRegion="polite">{message}</ThemedText>}
        {!!error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
        <FlatList
          data={reconciled}
          keyExtractor={item => item.row.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.section}>
              {!!rows.length && <>
                <ThemedText>{rows.length} righe estratte · Intervallo rilevato: {dates[0] || '?'} — {dates.at(-1) || '?'}</ThemedText>
                <ThemedText>Controllare la completezza sul documento originale. Le righe non lette non vengono importate.</ThemedText>
                {warnings.map((warning, index) => <ThemedText key={index}>{warning}</ThemedText>)}
                <ThemedText type="subtitle">Conferma il conto</ThemedText>
                <View style={styles.actions}>{accounts.map(a => (
                  <View key={a.accountId}>{button(a.name, () => {
                    setAccount(a.name); setConfirmedAccount(false); setExisting(null);
                    setRows(old => old.map(row => ({ ...row, decision: 'auto' })));
                  }, disabled, a.name === account)}</View>
                ))}</View>
                {!accounts.length && <ThemedText>Creare un conto prima di importare.</ThemedText>}
                {button('Conferma conto / aggiorna riconciliazione', () => void refresh(), disabled || !account)}
                <ThemedText>{existing === null ? 'Riconciliazione da caricare' : `${linked} collegati · ${missing} mancanti · ${pending} da verificare`}</ThemedText>
              </>}
            </View>
          }
          renderItem={({ item }) => {
            const row = rows.find(r => r.id === item.row.id)!;
            return <View style={[styles.row, { borderColor: color }]}>
              <ThemedText>{existing === null ? 'Da riconciliare' : ({ matched: 'Collegato', missing: 'Nuovo movimento', review: 'Da verificare', skipped: 'Escluso' })[item.status]}</ThemedText>
              <TextInput accessibilityLabel="Data movimento" editable={!disabled}
                style={[styles.input, { color, backgroundColor }]} value={row.date}
                onChangeText={date => update(row.id, { date })}
                onBlur={() => { const date = statementDate(row.date); if (date) update(row.id, { date }); }} />
              <TextInput accessibilityLabel="Descrizione movimento" editable={!disabled} maxLength={500}
                style={[styles.input, { color, backgroundColor }]} value={row.description}
                onChangeText={description => update(row.id, { description })} />
              <TextInput accessibilityLabel="Importo EUR" editable={!disabled} keyboardType="decimal-pad"
                style={[styles.input, { color, backgroundColor }]} value={row.amountInput}
                onChangeText={amountInput => update(row.id, { amountInput, amount: statementAmount(amountInput) ?? NaN })} />
              <View style={styles.actions}>
                {button('Uscita', () => update(row.id, { type: 'expense' }), disabled, row.type === 'expense')}
                {button('Entrata', () => update(row.id, { type: 'income' }), disabled, row.type === 'income')}
                {button(row.decision === 'skip' ? 'Includi' : 'Escludi', () => update(row.id, { decision: row.decision === 'skip' ? 'auto' : 'skip' }))}
              </View>
              {existing !== null && item.candidates.map(t => (
                <View key={t.transactionId}>
                  {button(`Collega: ${t.date} · ${t.description} · ${t.amount.toFixed(2)} EUR`,
                    () => update(row.id, { decision: `link:${t.transactionId}` }), disabled, item.match?.transactionId === t.transactionId)}
                </View>
              ))}
              {existing !== null && item.candidates.length > 0 && button('Movimento distinto: crea nuovo',
                () => update(row.id, { decision: 'create' }), disabled, row.decision === 'create')}
            </View>;
          }}
          ListFooterComponent={<View style={styles.section}>
            {button(`Conferma importazione: ${missing} nuovi, ${linked} collegati`, () => void save(), !canSave)}
          </View>}
        />
      </View>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, gap: 12, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  button: { borderWidth: 1, borderRadius: 10, padding: 10 },
  disabled: { opacity: 0.45 },
  selected: { backgroundColor: '#44886644' },
  section: { gap: 12, paddingVertical: 16 },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  input: { borderWidth: 1, borderColor: '#888888', borderRadius: 8, padding: 10, fontSize: 16 },
});

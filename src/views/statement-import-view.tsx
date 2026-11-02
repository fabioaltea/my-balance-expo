import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { router, usePreventRemove } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import StatementImportReview, {
  type StatementDraftRow as DraftRow,
} from '@/src/components/statement-import/statement-import-review';
import { useDataContext } from '@/src/state/DataProvider';
import { useAuthContext } from '@/src/state/AuthProvider';
import { readStatement, MAX_STATEMENT_BYTES } from '@/src/helpers/StatementReader';
import { releaseStatementFile, statementFileSize } from '@/src/helpers/StatementFiles';
import { type StatementData } from '@/src/helpers/StatementParser';
import { detectStatementAccount } from '@/src/helpers/StatementAccount';
import {
  rememberStatementAccount,
  suggestRememberedStatementAccount,
} from '@/src/helpers/StatementAccountMemory';
import { reconcileStatement } from '@/src/helpers/StatementReconciliation';
import {
  fetchStatementTransactions,
  restoreStatementLinks,
  saveStatementImport,
} from '@/src/helpers/StatementImportService';
import type { Transaction } from '@/src/types/models';

export type InitialStatementRead = Promise<{ data?: StatementData; error?: string }>;

export default function StatementImportView({
  spreadsheetId,
  initialRead,
  initialFileName,
  onClose,
}: {
  spreadsheetId: string | null;
  initialRead?: InitialStatementRead;
  initialFileName?: string;
  onClose?: () => void;
}) {
  const { accounts, reloadData } = useDataContext();
  const { user } = useAuthContext();
  const [fileName, setFileName] = useState(initialFileName || '');
  const [accountHeader, setAccountHeader] = useState<string | undefined>();
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [account, setAccount] = useState('');
  const [confirmedAccount, setConfirmedAccount] = useState(false);
  const [existing, setExisting] = useState<Transaction[] | null>(null);
  const [busy, setBusy] = useState<'read' | 'save' | null>(initialRead ? 'read' : null);
  const [message, setMessage] = useState(initialRead ? 'Lettura locale del documento...' : '');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ created: number; total: number } | null>(null);
  const job = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const initialContext = useRef({ accounts, userId: user?.id || '', scope: spreadsheetId || '' });
  useEffect(() => () => job.current?.abort(), []);
  useEffect(() => {
    if (!initialRead) return;
    let active = true;
    void initialRead.then(async ({ data, error: readError }) => {
      if (!active) return;
      if (data) {
        const context = initialContext.current;
        const suggestion = await suggestRememberedStatementAccount(
          context.userId,
          context.scope,
          data.accountName,
          context.accounts,
        );
        if (!active) return;
        setRows(
          data.transactions.map((row) => ({
            ...row,
            id: `initial:${row.id}`,
            amountInput: row.amount.toFixed(2).replace('.', ','),
            decision: 'auto' as const,
          })),
        );
        setWarnings(data.warnings);
        setAccountHeader(data.accountName);
        setAccount(suggestion);
        setMessage('Verificare tutte le righe e confermare il conto. Nessun dato salvato.');
      } else {
        setError(readError || 'Lettura non riuscita.');
        setMessage('');
      }
      setBusy(null);
    });
    return () => {
      active = false;
    };
  }, [initialRead]);

  const reconciled = useMemo(
    () => reconcileStatement(rows, existing || [], account),
    [rows, existing, account],
  );
  const pending = reconciled.filter((r) => r.status === 'review').length;
  const missing = reconciled.filter((r) => r.status === 'missing').length;
  const linked = reconciled.filter((r) => r.status === 'matched').length;
  usePreventRemove(busy === 'save');
  const disabled = !!busy || done;
  const canSave =
    !disabled &&
    !!spreadsheetId &&
    confirmedAccount &&
    accounts.some((a) => a.name === account) &&
    existing !== null &&
    pending === 0 &&
    missing + linked > 0;

  const update = (id: string, changes: Partial<DraftRow>) => {
    setRows((old) =>
      old.map((row) => (row.id === id ? { ...row, decision: 'auto', ...changes } : row)),
    );
  };

  async function acquire(source: 'file' | 'camera' | 'gallery') {
    if (job.current || !spreadsheetId) return;
    const controller = new AbortController();
    job.current = controller;
    setBusy('read');
    setError('');
    setMessage('Selezione documento...');
    const owned: string[] = [];
    try {
      let assets: { uri: string; mimeType?: string; name?: string; size?: number }[] = [];
      if (source === 'file') {
        const picked = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
          base64: false,
        });
        if (picked.canceled) return;
        assets = picked.assets;
      } else {
        if (source === 'camera' && Platform.OS !== 'web') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted)
            throw new Error(
              'Accesso alla fotocamera negato. Abilitarlo nelle impostazioni o scegliere un file.',
            );
        }
        const picked =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 1,
                allowsMultipleSelection: true,
                selectionLimit: 30,
              });
        if (picked.canceled) return;
        assets = picked.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType, size: a.fileSize }));
      }
      owned.push(...assets.map((a) => a.uri));
      controller.signal.throwIfAborted();
      if (assets.length > 30) throw new Error('Selezionare al massimo 30 immagini alla volta.');
      const draft: DraftRow[] = source === 'file' ? [] : [...rows];
      const notices: string[] = source === 'file' ? [] : [...warnings];
      let suggestion = '';
      let header: string | undefined;
      for (const asset of assets) {
        if ((asset.size ?? (await statementFileSize(asset.uri))) > MAX_STATEMENT_BYTES) {
          throw new Error('Documento troppo grande: massimo 25 MB.');
        }
        const pdf = asset.mimeType === 'application/pdf' || /\.pdf$/i.test(asset.name || asset.uri);
        const data = await readStatement(asset.uri, pdf, setMessage, controller.signal);
        const prefix = ++sequence.current;
        draft.push(
          ...data.transactions.map((row) => ({
            ...row,
            id: `${prefix}:${row.id}`,
            amountInput: row.amount.toFixed(2).replace('.', ','),
            decision: 'auto' as const,
          })),
        );
        notices.push(...data.warnings.map((w) => `Documento ${prefix}: ${w}`));
        header ||= data.accountName;
        suggestion ||= await suggestRememberedStatementAccount(
          user?.id || '',
          spreadsheetId,
          data.accountName,
          accounts,
        );
      }
      controller.signal.throwIfAborted();
      setFileName(
        assets[0]?.name || (source === 'camera' ? 'Foto del documento' : 'Immagine del documento'),
      );
      setAccountHeader(source === 'file' ? header : accountHeader || header);
      setRows(draft);
      setWarnings(notices);
      setExisting(null);
      setConfirmedAccount(false);
      if (source === 'file' || !account) setAccount(suggestion);
      setMessage('Verificare tutte le righe e confermare il conto. Nessun dato salvato.');
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Lettura non riuscita.');
    } finally {
      for (const uri of owned) {
        try {
          await releaseStatementFile(uri);
        } catch {
          if (!controller.signal.aborted)
            setError(
              'Impossibile eliminare una copia temporanea. Chiudere l’app e svuotare la cache prima di condividere il dispositivo.',
            );
        }
      }
      if (job.current === controller && !controller.signal.aborted) {
        job.current = null;
        setBusy(null);
      }
    }
  }

  async function refresh() {
    if (!spreadsheetId || !account || job.current) return;
    const controller = new AbortController();
    job.current = controller;
    setBusy('read');
    setError('');
    setExisting(null);
    setMessage('Caricamento transazioni per la riconciliazione locale...');
    try {
      const data = await fetchStatementTransactions(spreadsheetId, account);
      const restored = await restoreStatementLinks(spreadsheetId, account, rows, data);
      controller.signal.throwIfAborted();
      setRows((old) => restored.map((row, i) => ({ ...row, amountInput: old[i].amountInput })));
      setExisting(data);
      setConfirmedAccount(true);
      await rememberStatementAccount(
        user?.id || '',
        spreadsheetId,
        accountHeader,
        accounts.find((a) => a.name === account)?.accountId || '',
      );
      controller.signal.throwIfAborted();
      setMessage(
        'Riconciliazione aggiornata. Controllare date, importi, direzioni e collegamenti.',
      );
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Riconciliazione non disponibile.');
    } finally {
      if (!controller.signal.aborted) {
        job.current = null;
        setBusy(null);
      }
    }
  }

  async function save() {
    if (!canSave || !spreadsheetId || job.current) return;
    const controller = new AbortController();
    job.current = controller;
    setBusy('save');
    setError('');
    setMessage('Verifica finale prima del salvataggio...');
    setSaveProgress({ created: 0, total: missing });
    try {
      const result = await saveStatementImport(
        spreadsheetId,
        account,
        reconciled,
        (saved, matched) => {
          if (!controller.signal.aborted) {
            setSaveProgress({ created: saved, total: missing });
            setMessage(
              `${saved} nuovi salvati, ${matched} collegati. Non chiudere durante il salvataggio.`,
            );
          }
        },
        controller.signal,
      );
      controller.signal.throwIfAborted();
      setMessage(
        `Importazione completata: ${result.saved} nuovi movimenti, ${result.linked} collegati senza duplicarli.`,
      );
      setDone(true);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(
          e instanceof Error
            ? e.message
            : 'Importazione interrotta. Verificare i movimenti salvati.',
        );
        setExisting(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        job.current = null;
        setBusy(null);
        setSaveProgress(null);
      }
      try {
        await reloadData();
      } catch {
        if (!controller.signal.aborted)
          setError(
            'Impossibile aggiornare i dati. Verificare i movimenti prima di un nuovo import.',
          );
      }
    }
  }

  return (
    <StatementImportReview
      fileName={fileName}
      detectedAccount={detectStatementAccount(accountHeader).label}
      rows={rows}
      reconciled={reconciled}
      accounts={accounts}
      account={account}
      confirmedAccount={confirmedAccount}
      existingLoaded={existing !== null}
      scopeAvailable={!!spreadsheetId}
      canSave={canSave}
      busy={busy}
      saveProgress={saveProgress}
      done={done}
      message={message}
      error={error}
      warnings={warnings}
      showCaptureControls={!onClose}
      onClose={() => {
        job.current?.abort();
        if (onClose) onClose();
        else router.back();
      }}
      onAcquire={(source) => void acquire(source)}
      onUpdate={update}
      onAccountChange={(name) => {
        setAccount(name);
        setConfirmedAccount(false);
        setExisting(null);
        setRows((old) => old.map((row) => ({ ...row, decision: 'auto' })));
      }}
      onRefresh={() => void refresh()}
      onSave={() => void save()}
    />
  );
}

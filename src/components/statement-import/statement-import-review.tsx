import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenView, ThemedText } from '@/src/components/core';
import { Pressable } from '@/src/components/core/interactive';
import TransactionTypeToggle from '@/src/components/ui/transaction-type-toggle';
import CompactAccountPicker from '@/src/components/ui/compact-account-picker';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { statementAmount, statementDate, statementDay } from '@/src/helpers/StatementParser';
import type { ReconciledRow, ReviewRow } from '@/src/helpers/StatementReconciliation';
import {
  statementTransactionKey,
  statementDirectionConflict,
} from '@/src/helpers/StatementReconciliation';
import type { Account } from '@/src/types/models';

export type StatementDraftRow = ReviewRow & { amountInput: string };
type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
type Filter = 'all' | ReconciledRow['status'];
interface LinkTransition {
  filter: Filter;
  account: string;
}

export interface StatementImportReviewProps {
  fileName: string;
  detectedAccount?: string;
  rows: StatementDraftRow[];
  reconciled: ReconciledRow[];
  accounts: Account[];
  account: string;
  confirmedAccount: boolean;
  existingLoaded: boolean;
  scopeAvailable: boolean;
  canSave: boolean;
  busy: 'read' | 'save' | null;
  saveProgress?: { created: number; total: number } | null;
  done: boolean;
  message: string;
  error: string;
  warnings: string[];
  showCaptureControls: boolean;
  onClose: () => void;
  onAcquire: (source: 'file' | 'camera' | 'gallery') => void;
  onUpdate: (id: string, changes: Partial<StatementDraftRow>) => void;
  onAccountChange: (account: string) => void;
  onRefresh: () => void;
  onSave: () => void;
}

function useImportColors() {
  return {
    text: useThemeColor({ light: '#18221D', dark: '#F0F4F2' }, 'text'),
    muted: useThemeColor({ light: '#657169', dark: '#AEB8B2' }, 'tabIconDefault'),
    panel: useThemeColor({ light: '#F6F8F6', dark: '#1D211F' }, 'background'),
    surface: useThemeColor({ light: '#FFFFFF', dark: '#232725' }, 'cardBackground'),
    control: useThemeColor({ light: '#EEF2EF', dark: '#2A302D' }, 'menuBackground'),
    border: useThemeColor(
      { light: 'rgba(23,38,31,0.11)', dark: 'rgba(255,255,255,0.11)' },
      'cardBorder',
    ),
    accent: useThemeColor({ light: '#2F4F3F', dark: '#D6E8DE' }, 'tint'),
    selected: useThemeColor({ light: '#E8F0EB', dark: '#30443A' }, 'menuBackground'),
    linkedSurface: useThemeColor({ light: '#EDF5EF', dark: '#263C30' }, 'cardBackground'),
    linkedBorder: useThemeColor({ light: '#8EB69A', dark: '#587D64' }, 'cardBorder'),
    warning: useThemeColor({ light: '#8A5B23', dark: '#EDC28B' }, 'text'),
    warningSurface: useThemeColor({ light: '#FBF5E9', dark: '#3A3124' }, 'menuBackground'),
    danger: useThemeColor({ light: '#A33E38', dark: '#F0AAA4' }, 'text'),
    dangerSurface: useThemeColor({ light: '#FBEEEC', dark: '#3B2826' }, 'menuBackground'),
  };
}
type ImportColors = ReturnType<typeof useImportColors>;

function useReducedImportMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
  return reduced;
}

export default function StatementImportReview(props: StatementImportReviewProps) {
  const colors = useImportColors();
  const compact = useWindowDimensions().width < 760;
  const [filter, setFilter] = useState<Filter>('all');
  const [showWarnings, setShowWarnings] = useState(false);
  const [linkTransitions, setLinkTransitions] = useState<Record<string, LinkTransition>>({});
  const [linkFeedback, setLinkFeedback] = useState<string | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const latestReview = useRef({
    rows: props.reconciled,
    account: props.account,
    loaded: props.existingLoaded,
  });
  useEffect(() => {
    latestReview.current = {
      rows: props.reconciled,
      account: props.account,
      loaded: props.existingLoaded,
    };
  }, [props.reconciled, props.account, props.existingLoaded]);
  const reducedMotion = useReducedImportMotion();
  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      Object.values(linkTimers.current).forEach(clearTimeout);
    },
    [],
  );
  const { busy, onClose } = props;
  const disabled = !!props.busy || props.done;
  const counts = {
    all: props.rows.length,
    missing: props.reconciled.filter((r) => r.status === 'missing').length,
    matched: props.reconciled.filter((r) => r.status === 'matched').length,
    review: props.reconciled.filter((r) => r.status === 'review').length,
    skipped: props.reconciled.filter((r) => r.status === 'skipped').length,
  };
  const activeFilter = props.existingLoaded ? filter : 'all';
  const visibleRows = props.reconciled.filter(
    (r) =>
      activeFilter === 'all' ||
      r.status === activeFilter ||
      (r.status === 'matched' &&
        props.existingLoaded &&
        linkTransitions[r.row.id]?.filter === activeFilter &&
        linkTransitions[r.row.id]?.account === props.account),
  );
  const selectFilter = (value: Filter) => {
    setFilter(value);
    setLinkTransitions({});
    Object.values(linkTimers.current).forEach(clearTimeout);
    linkTimers.current = {};
  };
  const updateRow: StatementImportReviewProps['onUpdate'] = (id, changes) => {
    const previous = props.reconciled.find((item) => item.row.id === id);
    if (
      props.existingLoaded &&
      changes.decision?.startsWith('link:') &&
      previous &&
      (!previous.match || statementTransactionKey(previous.match) !== changes.decision.slice(5))
    ) {
      setLinkTransitions((current) => ({
        ...current,
        [id]: { filter: activeFilter, account: props.account },
      }));
      if (linkTimers.current[id]) clearTimeout(linkTimers.current[id]);
      const account = props.account;
      // FlatList may unmount an off-screen row before its animation completes.
      linkTimers.current[id] = setTimeout(() => {
        const latest = latestReview.current;
        finishLinkTransition(
          id,
          latest.loaded &&
            latest.account === account &&
            latest.rows.some((item) => item.row.id === id && item.status === 'matched'),
        );
      }, 2000);
    }
    props.onUpdate(id, changes);
  };
  const finishLinkTransition = useCallback(
    (id: string, confirmed: boolean) => {
      if (linkTimers.current[id]) clearTimeout(linkTimers.current[id]);
      delete linkTimers.current[id];
      setLinkTransitions((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      if (confirmed) {
        setLinkFeedback(props.account);
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setLinkFeedback(null), 6000);
      }
    },
    [props.account],
  );
  const drafts = new Map(props.rows.map((row) => [row.id, row]));
  // A movement already linked to a statement row cannot be offered to another one.
  const linkedTo = new Map<string, string>();
  props.reconciled.forEach((r) => {
    if (r.status === 'matched' && r.match) linkedTo.set(statementTransactionKey(r.match), r.row.id);
  });
  const dates = props.rows
    .map((r) => r.date)
    .filter((d) => statementDate(d))
    .sort((a, b) => statementDay(a) - statementDay(b));
  const step = props.done ? 3 : !props.rows.length ? 0 : props.confirmedAccount ? 2 : 1;
  const blocker = !props.scopeAvailable
    ? 'Seleziona un foglio di lavoro per importare.'
    : !props.rows.length
      ? 'Scegli un documento per iniziare.'
      : !props.confirmedAccount
        ? 'Conferma il conto prima di importare.'
        : counts.review
          ? `Completa la revisione di ${counts.review} ${counts.review === 1 ? 'riga' : 'righe'}.`
          : counts.missing + counts.matched === 0
            ? 'Tutti i movimenti sono esclusi.'
            : 'Controlla i movimenti prima di confermare.';

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && busy !== 'save') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [busy, onClose]);

  return (
    <ScreenView>
      <View style={[styles.container, { backgroundColor: colors.panel }]}>
        <View style={[styles.header, { borderColor: colors.border }]}>
          <View style={[styles.documentIcon, { backgroundColor: colors.selected }]}>
            <MaterialIcons name="description" size={23} color={colors.accent} />
          </View>
          <View style={styles.grow}>
            <ThemedText style={[styles.title, { color: colors.text }]}>
              Importa estratto conto
            </ThemedText>
            <ThemedText numberOfLines={1} style={[styles.small, { color: colors.muted }]}>
              {props.fileName || 'PDF e immagini · EUR'}
            </ThemedText>
          </View>
          <ImportButton
            icon="close"
            label="Chiudi importazione"
            iconOnly
            colors={colors}
            disabled={props.busy === 'save'}
            onPress={props.onClose}
          />
        </View>

        <View style={[styles.steps, { borderColor: colors.border }]}>
          {['Documento', 'Conto', 'Revisione'].map((label, index) => (
            <View key={label} style={styles.step}>
              <View
                style={[
                  styles.stepNumber,
                  { backgroundColor: index <= step ? colors.selected : colors.control },
                ]}
              >
                {index < step ? (
                  <MaterialIcons name="check" size={14} color={colors.accent} />
                ) : (
                  <ThemedText
                    style={[
                      styles.stepText,
                      { color: index === step ? colors.accent : colors.muted },
                    ]}
                  >
                    {index + 1}
                  </ThemedText>
                )}
              </View>
              <ThemedText
                style={[
                  styles.small,
                  {
                    color: index === step ? colors.text : colors.muted,
                    fontWeight: index === step ? '600' : '400',
                  },
                ]}
              >
                {label}
              </ThemedText>
              {index < 2 && !compact && (
                <MaterialIcons name="chevron-right" size={16} color={colors.muted} />
              )}
            </View>
          ))}
          {!compact && (
            <View style={styles.privacy}>
              <MaterialIcons name="lock-outline" size={13} color={colors.muted} />
              <ThemedText style={[styles.caption, { color: colors.muted }]}>
                Lettura sul dispositivo
              </ThemedText>
            </View>
          )}
        </View>

        <FlatList
          style={styles.list}
          contentContainerStyle={[styles.listContent, compact && styles.listContentCompact]}
          data={props.done ? [] : visibleRows}
          keyExtractor={(item) => item.row.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {!!props.error && (
                <View
                  accessibilityRole="alert"
                  style={[styles.notice, { backgroundColor: colors.dangerSurface }]}
                >
                  <MaterialIcons name="error-outline" size={19} color={colors.danger} />
                  <View style={styles.grow}>
                    <ThemedText style={[styles.noticeTitle, { color: colors.danger }]}>
                      Importazione da verificare
                    </ThemedText>
                    <ThemedText style={[styles.small, { color: colors.danger }]}>
                      {props.error}
                    </ThemedText>
                  </View>
                </View>
              )}
              {!props.scopeAvailable && (
                <View
                  accessibilityRole="alert"
                  style={[styles.notice, { backgroundColor: colors.warningSurface }]}
                >
                  <MaterialIcons name="info-outline" size={19} color={colors.warning} />
                  <ThemedText style={[styles.small, styles.grow, { color: colors.warning }]}>
                    Seleziona un foglio di lavoro prima di importare.
                  </ThemedText>
                </View>
              )}
              {props.done ? (
                <View style={styles.emptyState}>
                  <View style={[styles.resultIcon, { backgroundColor: colors.selected }]}>
                    <MaterialIcons name="check" size={30} color={colors.accent} />
                  </View>
                  <ThemedText style={[styles.stateTitle, { color: colors.text }]}>
                    Importazione completata
                  </ThemedText>
                  <ThemedText
                    accessibilityLiveRegion="polite"
                    style={[styles.stateText, { color: colors.muted }]}
                  >
                    {props.message}
                  </ThemedText>
                </View>
              ) : (
                <>
                  {props.busy && (
                    <View
                      style={[styles.progress, { backgroundColor: colors.selected }]}
                      accessibilityLiveRegion="polite"
                    >
                      <ActivityIndicator size="small" color={colors.accent} />
                      <View style={styles.grow}>
                        <ThemedText style={[styles.noticeTitle, { color: colors.accent }]}>
                          {props.busy === 'save' ? 'Salvataggio in corso' : 'Elaborazione in corso'}
                        </ThemedText>
                        <ThemedText style={[styles.small, { color: colors.accent }]}>
                          {props.message}
                        </ThemedText>
                        {props.busy === 'save' && !!props.saveProgress?.total && (
                          <View style={styles.progressTrack}>
                            <View
                              style={[styles.progressBar, { backgroundColor: colors.border }]}
                              accessibilityRole="progressbar"
                              accessibilityValue={{
                                min: 0,
                                max: props.saveProgress.total,
                                now: props.saveProgress.created,
                              }}
                            >
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    backgroundColor: colors.accent,
                                    width: `${Math.min(100, (props.saveProgress.created / props.saveProgress.total) * 100)}%`,
                                  },
                                ]}
                              />
                            </View>
                            <ThemedText style={[styles.progressCount, { color: colors.accent }]}>
                              {props.saveProgress.created}/{props.saveProgress.total} creati
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                  <View style={styles.documentBar}>
                    <View style={styles.grow}>
                      <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                        {props.rows.length
                          ? `${props.rows.length} movimenti rilevati`
                          : 'Il tuo estratto conto'}
                      </ThemedText>
                      <ThemedText style={[styles.small, { color: colors.muted }]}>
                        {dates.length
                          ? `${dates[0]} — ${dates.at(-1)}`
                          : 'PDF e immagini · fino a 25 MB per file'}
                      </ThemedText>
                    </View>
                    <ImportButton
                      label={props.rows.length || props.fileName ? 'Cambia file' : 'Scegli file'}
                      icon="upload-file"
                      colors={colors}
                      disabled={disabled || !props.scopeAvailable}
                      onPress={() => props.onAcquire('file')}
                    />
                  </View>
                  {props.showCaptureControls && (
                    <View style={styles.captureActions}>
                      <ImportButton
                        label="Fotocamera"
                        icon="photo-camera"
                        colors={colors}
                        disabled={disabled || !props.scopeAvailable}
                        onPress={() => props.onAcquire('camera')}
                      />
                      <ImportButton
                        label="Galleria"
                        icon="photo-library"
                        colors={colors}
                        disabled={disabled || !props.scopeAvailable}
                        onPress={() => props.onAcquire('gallery')}
                      />
                    </View>
                  )}
                  {!!props.warnings.length && (
                    <View style={[styles.warningPanel, { backgroundColor: colors.warningSurface }]}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Mostra avvisi del documento"
                        accessibilityState={{ expanded: showWarnings }}
                        onPress={() => setShowWarnings((value) => !value)}
                        style={styles.warningToggle}
                      >
                        <MaterialIcons name="warning-amber" size={18} color={colors.warning} />
                        <ThemedText
                          style={[
                            styles.small,
                            styles.grow,
                            { color: colors.warning, fontWeight: '600' },
                          ]}
                        >
                          {props.warnings.length}{' '}
                          {props.warnings.length === 1
                            ? 'avviso da controllare'
                            : 'avvisi da controllare'}
                        </ThemedText>
                        <MaterialIcons
                          name={showWarnings ? 'expand-less' : 'expand-more'}
                          size={20}
                          color={colors.warning}
                        />
                      </Pressable>
                      {showWarnings && (
                        <View style={styles.warningContent}>
                          {props.warnings.map((warning, index) => (
                            <ThemedText
                              key={index}
                              style={[styles.small, { color: colors.warning }]}
                            >
                              {warning}
                            </ThemedText>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {!!props.rows.length && (
                    <View
                      style={[
                        styles.accountPanel,
                        !compact && styles.accountPanelWide,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <View style={[styles.sectionHeading, !compact && styles.accountHeadingWide]}>
                        {props.confirmedAccount && (
                          <MaterialIcons name="check-circle" size={20} color={colors.accent} />
                        )}
                        <View style={styles.grow}>
                          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                            Conto di destinazione
                          </ThemedText>
                          <ThemedText style={[styles.small, { color: colors.muted }]}>
                            {props.detectedAccount ||
                              (props.confirmedAccount
                                ? 'Conto confermato'
                                : 'Scegli il conto dell’estratto.')}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={[styles.accountActions, !compact && styles.accountActionsWide]}>
                        <View style={styles.accounts}>
                          {!!props.accounts.length && (
                            <CompactAccountPicker
                              accounts={props.accounts}
                              selectedAccount={props.account}
                              setSelectedAccount={props.onAccountChange}
                              disabled={disabled}
                            />
                          )}
                          {!props.accounts.length && (
                            <ThemedText style={[styles.small, { color: colors.muted }]}>
                              Crea un conto prima di importare.
                            </ThemedText>
                          )}
                        </View>
                        <ImportButton
                          label={props.confirmedAccount ? 'Aggiorna confronto' : 'Conferma conto'}
                          icon={props.confirmedAccount ? 'refresh' : 'arrow-forward'}
                          colors={colors}
                          variant={props.confirmedAccount ? 'secondary' : 'primary'}
                          disabled={disabled || !props.account}
                          onPress={props.onRefresh}
                        />
                      </View>
                    </View>
                  )}

                  {!!props.rows.length && (
                    <>
                      <View style={styles.reviewHeading}>
                        <View style={styles.grow}>
                          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                            Revisione movimenti
                          </ThemedText>
                          <ThemedText style={[styles.small, { color: colors.muted }]}>
                            Confronta le righe con il documento originale e correggi i dati letti.
                          </ThemedText>
                        </View>
                      </View>
                      <View style={[styles.filters, { borderColor: colors.border }]}>
                        {(
                          [
                            ['all', 'Tutti'],
                            ['missing', 'Nuovi'],
                            ['matched', 'Collegati'],
                            ['review', 'Da verificare'],
                            ['skipped', 'Esclusi'],
                          ] as const
                        ).map(([value, label]) => (
                          <Pressable
                            key={value}
                            accessibilityRole="button"
                            accessibilityLabel={`${label}: ${props.existingLoaded || value === 'all' ? counts[value] : 'da riconciliare'}`}
                            accessibilityState={{
                              selected: activeFilter === value,
                              disabled: !props.existingLoaded && value !== 'all',
                            }}
                            disabled={!props.existingLoaded && value !== 'all'}
                            onPress={() => selectFilter(value)}
                            style={[
                              styles.filter,
                              value === 'matched' &&
                                counts.matched > 0 && { backgroundColor: colors.linkedSurface },
                              activeFilter === value && { backgroundColor: colors.selected },
                            ]}
                          >
                            {value === 'matched' && counts.matched > 0 && (
                              <MaterialIcons name="check-circle" size={14} color={colors.accent} />
                            )}
                            <ThemedText
                              style={[
                                styles.small,
                                {
                                  color: activeFilter === value ? colors.accent : colors.muted,
                                  fontWeight: '500',
                                },
                              ]}
                            >
                              {label}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.filterCount,
                                { color: activeFilter === value ? colors.accent : colors.muted },
                              ]}
                            >
                              {props.existingLoaded || value === 'all' ? counts[value] : '—'}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}
            </>
          }
          ListEmptyComponent={
            !props.done ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name={
                    props.busy ? 'find-in-page' : props.rows.length ? 'filter-list' : 'description'
                  }
                  size={34}
                  color={colors.muted}
                />
                <ThemedText style={[styles.stateTitle, { color: colors.text }]}>
                  {props.busy
                    ? 'Stiamo leggendo il documento'
                    : props.rows.length
                      ? 'Nessun movimento in questo filtro'
                      : 'Nessun movimento da mostrare'}
                </ThemedText>
                <ThemedText style={[styles.stateText, { color: colors.muted }]}>
                  {props.busy
                    ? 'L’elaborazione avviene sul dispositivo. Gli estratti lunghi possono richiedere qualche minuto.'
                    : props.rows.length
                      ? 'Scegli un altro filtro per vedere le altre righe.'
                      : 'Scegli un file con movimenti leggibili per continuare.'}
                </ThemedText>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <MovementReviewRow
              item={item}
              row={drafts.get(item.row.id)!}
              colors={colors}
              compact={compact}
              disabled={disabled}
              existingLoaded={props.existingLoaded}
              linkedTo={linkedTo}
              onUpdate={updateRow}
              confirmation={
                props.existingLoaded && linkTransitions[item.row.id]?.account === props.account
                  ? linkTransitions[item.row.id]
                  : undefined
              }
              leavingFilter={activeFilter !== 'all' && activeFilter !== 'matched'}
              reducedMotion={reducedMotion}
              onTransitionEnd={finishLinkTransition}
            />
          )}
          ListFooterComponent={
            props.rows.length && !props.done ? (
              <View style={styles.listNote}>
                <MaterialIcons name="info-outline" size={15} color={colors.muted} />
                <ThemedText style={[styles.caption, styles.grow, { color: colors.muted }]}>
                  L’intervallo indicato comprende le righe rilevate. Verifica la completezza sul
                  documento originale.
                </ThemedText>
              </View>
            ) : undefined
          }
        />

        <View style={[styles.footerWrap, { borderColor: colors.border }]}>
          {linkFeedback === props.account && props.existingLoaded && !props.done && (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.linkFeedback,
                { backgroundColor: colors.linkedSurface, borderColor: colors.linkedBorder },
              ]}
            >
              <MaterialIcons name="check-circle" size={19} color={colors.accent} />
              <ThemedText style={[styles.small, styles.grow, { color: colors.accent }]}>
                Collegamento confermato. Lo trovi in Collegati.
              </ThemedText>
              <ImportButton
                label="Vedi collegati"
                colors={colors}
                variant="quiet"
                onPress={() => {
                  selectFilter('matched');
                  setLinkFeedback(null);
                }}
              />
              <ImportButton
                label="Chiudi conferma collegamento"
                icon="close"
                iconOnly
                colors={colors}
                onPress={() => setLinkFeedback(null)}
              />
            </View>
          )}
          <View style={styles.footer}>
            <View style={styles.grow}>
              <ThemedText style={styles.footerLabel}>
                {props.done ? 'Tutto pronto' : 'Da importare'}
              </ThemedText>
              <ThemedText style={styles.footerTotal}>
                {props.done
                  ? 'Movimenti aggiornati'
                  : props.existingLoaded
                    ? `${counts.missing} nuovi · ${counts.matched} collegati`
                    : 'Revisione in corso'}
              </ThemedText>
              {!compact && (
                <ThemedText style={styles.footerHint}>
                  {props.busy === 'save'
                    ? 'Attendi il completamento del salvataggio.'
                    : props.done
                      ? 'Puoi tornare alla dashboard.'
                      : blocker}
                </ThemedText>
              )}
            </View>
            <ImportButton
              colors={colors}
              variant="confirm"
              disabled={!props.done && !props.canSave}
              label={
                props.done
                  ? 'Fatto'
                  : props.busy === 'save'
                    ? 'Salvataggio…'
                    : counts.missing
                      ? `Importa ${counts.missing} movimenti`
                      : 'Conferma collegamenti'
              }
              icon={props.done ? 'check' : 'arrow-forward'}
              onPress={props.done ? props.onClose : props.onSave}
            />
          </View>
          {compact && !props.done && (
            <ThemedText style={[styles.caption, { color: colors.muted }]}>{blocker}</ThemedText>
          )}
        </View>
      </View>
    </ScreenView>
  );
}

function MovementReviewRow({
  item,
  row,
  colors,
  compact,
  disabled,
  existingLoaded,
  linkedTo,
  onUpdate,
  confirmation,
  leavingFilter,
  reducedMotion,
  onTransitionEnd,
}: {
  item: ReconciledRow;
  row: StatementDraftRow;
  colors: ImportColors;
  compact: boolean;
  disabled: boolean;
  existingLoaded: boolean;
  linkedTo: Map<string, string>;
  onUpdate: StatementImportReviewProps['onUpdate'];
  confirmation?: LinkTransition;
  leavingFilter: boolean;
  reducedMotion: boolean;
  onTransitionEnd: (id: string, confirmed: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rowHeight, setRowHeight] = useState(0);
  const [exitingConfirmation, setExitingConfirmation] = useState<LinkTransition | null>(null);
  const [opacity] = useState(() => new Animated.Value(1));
  const [translateX] = useState(() => new Animated.Value(0));
  const [collapse] = useState(() => new Animated.Value(1));
  const [feedback] = useState(() => new Animated.Value(0));
  const matched = existingLoaded && item.status === 'matched';
  const confirming = !!confirmation && matched;
  const exiting =
    confirming && leavingFilter && exitingConfirmation === confirmation && !reducedMotion;
  const controlsDisabled = disabled || confirming;
  useEffect(() => {
    if (!confirmation) return;
    if (!matched) {
      const timer = setTimeout(() => onTransitionEnd(row.id, false), 0);
      return () => clearTimeout(timer);
    }
    let cancelled = false;
    let exitAnimation: Animated.CompositeAnimation | undefined;
    opacity.setValue(1);
    translateX.setValue(0);
    collapse.setValue(1);
    feedback.setValue(reducedMotion ? 1 : 0);
    const appear = Animated.timing(feedback, {
      toValue: 1,
      duration: reducedMotion ? 0 : 180,
      useNativeDriver: true,
    });
    appear.start();
    const timer = setTimeout(() => {
      if (!leavingFilter || reducedMotion) {
        onTransitionEnd(row.id, true);
        return;
      }
      setExitingConfirmation(confirmation);
      exitAnimation = Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 22, duration: 220, useNativeDriver: true }),
        Animated.timing(collapse, { toValue: 0, duration: 260, useNativeDriver: false }),
      ]);
      exitAnimation.start(({ finished }) => {
        if (finished && !cancelled) onTransitionEnd(row.id, true);
      });
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      appear.stop();
      exitAnimation?.stop();
    };
  }, [
    confirmation,
    matched,
    leavingFilter,
    reducedMotion,
    row.id,
    onTransitionEnd,
    opacity,
    translateX,
    collapse,
    feedback,
  ]);
  const status = !existingLoaded
    ? 'Da confrontare'
    : {
        matched: 'Collegato',
        missing: 'Nuovo movimento',
        review: 'Da verificare',
        skipped: 'Escluso',
      }[item.status];
  const skipped = row.decision === 'skip';
  const statusColor =
    existingLoaded && item.status === 'review'
      ? colors.warning
      : existingLoaded && item.status === 'matched'
        ? colors.accent
        : colors.muted;
  const candidatesVisible =
    expanded ||
    confirming ||
    (existingLoaded && item.status === 'review' && item.candidates.length > 0);
  const update = (changes: Partial<StatementDraftRow>) => onUpdate(row.id, changes);
  const fieldColumnWidth = compact ? 104 : 140;
  return (
    <Animated.View
      style={[
        styles.movementAnimation,
        exiting && {
          height: collapse.interpolate({ inputRange: [0, 1], outputRange: [0, rowHeight + 10] }),
        },
      ]}
    >
      <Animated.View style={exiting && { opacity, transform: [{ translateX }] }}>
        <View
          testID={`statement-row-${row.id}`}
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            setRowHeight((previous) => (Math.abs(previous - height) < 1 ? previous : height));
          }}
          style={[
            styles.movement,
            {
              backgroundColor: matched ? colors.linkedSurface : colors.surface,
              borderColor: matched ? colors.linkedBorder : colors.border,
            },
          ]}
        >
          <View style={styles.movementHeading}>
            <View
              style={[
                styles.statusLabel,
                matched && styles.linkedStatus,
                matched && { backgroundColor: colors.selected },
              ]}
            >
              {matched ? (
                <MaterialIcons name="check-circle" size={15} color={colors.accent} />
              ) : (
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              )}
              <ThemedText style={[styles.caption, { color: statusColor, fontWeight: '600' }]}>
                {status}
              </ThemedText>
            </View>
            <ImportButton
              label={skipped ? 'Includi' : 'Escludi'}
              icon={skipped ? 'undo' : 'remove-circle-outline'}
              colors={colors}
              disabled={controlsDisabled}
              onPress={() => update({ decision: skipped ? 'auto' : 'skip' })}
              variant="quiet"
            />
          </View>
          {confirming && (
            <Animated.View
              accessibilityLiveRegion="polite"
              style={[styles.linkConfirmation, { opacity: feedback }]}
            >
              <MaterialIcons name="check-circle" size={19} color={colors.accent} />
              <View style={styles.grow}>
                <ThemedText style={[styles.noticeTitle, { color: colors.accent }]}>
                  Collegamento confermato
                </ThemedText>
                <ThemedText style={[styles.caption, { color: colors.accent }]}>
                  Ora lo trovi in Collegati.
                </ThemedText>
              </View>
            </Animated.View>
          )}
          <View style={[styles.typeAndDate, skipped && styles.skipped]}>
            <View style={[styles.field, { width: fieldColumnWidth }]}>
              <ThemedText style={[styles.fieldLabel, { color: colors.muted }]}>
                Tipologia
              </ThemedText>
              <TransactionTypeToggle
                type={row.type}
                onChange={(type) => update({ type })}
                disabled={controlsDisabled || skipped}
                showLabel
                style={styles.typeToggle}
              />
            </View>
            <ReviewField
              label="Data"
              accessibilityLabel="Data movimento"
              value={row.date}
              placeholder="gg-mm-aaaa"
              editable={!controlsDisabled && !skipped}
              colors={colors}
              width={fieldColumnWidth}
              error={
                !skipped && row.date && !statementDate(row.date) ? 'Data non valida' : undefined
              }
              onChangeText={(date) => update({ date })}
              onBlur={() => {
                const date = statementDate(row.date);
                if (date && date !== row.date) update({ date });
              }}
            />
          </View>
          <View style={[styles.fields, skipped && styles.skipped]}>
            <ReviewField
              label="Descrizione"
              accessibilityLabel="Descrizione movimento"
              value={row.description}
              placeholder="Descrizione del movimento"
              maxLength={500}
              editable={!controlsDisabled && !skipped}
              colors={colors}
              grow
              onChangeText={(description) => update({ description })}
            />
            <ReviewField
              label="Importo · EUR"
              accessibilityLabel="Importo EUR"
              value={row.amountInput}
              placeholder="0,00"
              keyboardType="decimal-pad"
              editable={!controlsDisabled && !skipped}
              error={
                !skipped && row.amountInput && !Number.isFinite(row.amount)
                  ? 'Importo non valido'
                  : undefined
              }
              colors={colors}
              width={fieldColumnWidth}
              amount
              onChangeText={(amountInput) =>
                update({
                  amountInput,
                  amount: parseDraftAmount(amountInput),
                })
              }
            />
          </View>
          <View style={styles.movementBottom}>
            {!row.type && !skipped && (
              <ThemedText style={[styles.caption, { color: colors.warning }]}>
                Scegli entrata o uscita
              </ThemedText>
            )}
            {existingLoaded && !!item.candidates.length && (
              <ImportButton
                colors={colors}
                variant="quiet"
                icon={expanded ? 'expand-less' : 'expand-more'}
                label={`${item.candidates.length} ${item.candidates.length === 1 ? 'corrispondenza' : 'corrispondenze'}`}
                onPress={() => setExpanded((value) => !value)}
              />
            )}
          </View>
          {existingLoaded && item.match && !candidatesVisible && (
            <View style={[styles.matchSummary, { borderColor: colors.linkedBorder }]}>
              <MaterialIcons name="link" size={15} color={colors.accent} />
              <ThemedText
                numberOfLines={1}
                style={[styles.caption, styles.grow, { color: colors.accent }]}
              >
                Collegato a {item.match.description} · {item.match.date}
              </ThemedText>
            </View>
          )}
          {candidatesVisible && (
            <View style={[styles.candidates, { borderColor: colors.border }]}>
              <ThemedText style={[styles.caption, { color: colors.muted }]}>
                Questo movimento è già presente? Scegli una corrispondenza o conferma che è
                distinto.
              </ThemedText>
              {item.candidates.map((transaction, index) => {
                const key = statementTransactionKey(transaction);
                const selected = !!item.match && statementTransactionKey(item.match) === key;
                const taken = !selected && linkedTo.has(key) && linkedTo.get(key) !== row.id;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`Collega a ${transaction.description} del ${transaction.date}`}
                    accessibilityState={{
                      selected,
                      disabled: controlsDisabled || skipped || taken,
                    }}
                    disabled={controlsDisabled || skipped || taken}
                    onPress={() => update({ decision: `link:${key}` })}
                    style={[
                      styles.candidate,
                      { backgroundColor: selected ? colors.selected : colors.control },
                      taken && { opacity: 0.55 },
                    ]}
                  >
                    <MaterialIcons
                      name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={18}
                      color={selected ? colors.accent : colors.muted}
                    />
                    <View style={styles.grow}>
                      <ThemedText style={[styles.small, { color: colors.text }]}>
                        {transaction.description}
                      </ThemedText>
                      <ThemedText style={[styles.caption, { color: colors.muted }]}>
                        {transaction.date}
                        {item.candidates.length > 1 ? ` · Opzione ${index + 1}` : ''}
                        {taken ? ' · Già collegato a un’altra riga' : ''}
                      </ThemedText>
                      {statementDirectionConflict(transaction) && (
                        <ThemedText style={[styles.caption, { color: colors.warning }]}>
                          Segno e tipologia salvata non coincidono: verifica questo collegamento.
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText style={[styles.candidateAmount, { color: colors.text }]}>
                      {transaction.amount.toLocaleString('it-IT', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </ThemedText>
                  </Pressable>
                );
              })}
              <ImportButton
                label="È un movimento distinto: crea nuovo"
                icon="add"
                colors={colors}
                selected={row.decision === 'create'}
                disabled={controlsDisabled || skipped}
                onPress={() => update({ decision: 'create' })}
              />
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function parseDraftAmount(input: string) {
  return statementAmount(input) ?? NaN;
}

function ReviewField({
  label,
  colors,
  grow,
  width,
  amount,
  error,
  onBlur,
  ...props
}: TextInputProps & {
  label: string;
  colors: ImportColors;
  grow?: boolean;
  width?: number;
  amount?: boolean;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, grow && styles.grow, width !== undefined && { width }]}>
      <ThemedText style={[styles.fieldLabel, { color: colors.muted }]}>{label}</ThemedText>
      <TextInput
        {...props}
        placeholderTextColor={colors.muted}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: focused ? colors.selected : colors.control,
            borderColor: error ? colors.danger : focused ? colors.accent : 'transparent',
          },
          amount && styles.amountInput,
        ]}
      />
      {!!error && (
        <ThemedText style={[styles.caption, { color: colors.danger }]}>{error}</ThemedText>
      )}
    </View>
  );
}

function ImportButton({
  label,
  colors,
  icon,
  iconOnly,
  disabled,
  selected,
  variant = 'secondary',
  onPress,
}: {
  label: string;
  colors: ImportColors;
  icon?: IconName;
  iconOnly?: boolean;
  disabled?: boolean;
  selected?: boolean;
  variant?: 'primary' | 'secondary' | 'quiet' | 'confirm';
  onPress: () => void;
}) {
  const background =
    variant === 'primary'
      ? '#2F4F3F'
      : variant === 'confirm'
        ? '#FFFFFF'
        : selected
          ? colors.selected
          : variant === 'quiet' || iconOnly
            ? 'transparent'
            : colors.control;
  const color =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'confirm'
        ? '#2F4F3F'
        : selected
          ? colors.accent
          : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        variant === 'quiet' && styles.quietButton,
        iconOnly && styles.iconButton,
        selected && { borderColor: colors.accent },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {icon && <MaterialIcons name={icon} size={iconOnly ? 20 : 16} color={color} />}
      {!iconOnly && <ThemedText style={[styles.buttonText, { color }]}>{label}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  grow: { flex: 1, minWidth: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
  },
  documentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.4 },
  small: { fontSize: 13, lineHeight: 19 },
  caption: { fontSize: 12, lineHeight: 17 },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepNumber: {
    width: 23,
    height: 23,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
  privacy: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 5,
  },
  list: { flex: 1, minHeight: 0 },
  listContent: { padding: 24, paddingTop: 20 },
  listContentCompact: { paddingHorizontal: 16 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  noticeTitle: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  progressTrack: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressCount: { fontSize: 12, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  documentBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  sectionTitle: { fontSize: 15, lineHeight: 21, fontWeight: '600', letterSpacing: -0.15 },
  captureActions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  warningPanel: { borderRadius: 12, marginBottom: 18 },
  warningToggle: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12 },
  warningContent: { padding: 14, paddingTop: 0, gap: 7 },
  accountPanel: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 16, marginBottom: 26 },
  accountPanelWide: { flexDirection: 'row', alignItems: 'center' },
  accountHeadingWide: { flex: 1, minWidth: 0 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  accountActionsWide: { flexWrap: 'nowrap', flexShrink: 0 },
  accounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reviewHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
  },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  filterCount: { fontSize: 12, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  movement: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  movementAnimation: { overflow: 'hidden' },
  linkedStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  linkConfirmation: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 },
  linkFeedback: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  movementHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeAndDate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  statusLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  fields: { flexDirection: 'row', gap: 10 },
  field: { gap: 5 },
  fieldLabel: { fontSize: 11, lineHeight: 15, fontWeight: '500', paddingHorizontal: 2 },
  input: {
    minHeight: 40,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  amountInput: { textAlign: 'right', fontWeight: '600', fontVariant: ['tabular-nums'] },
  movementBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  typeToggle: { width: '100%', height: 40, borderRadius: 9 },
  skipped: { opacity: 0.5 },
  matchSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 12,
  },
  candidates: { gap: 8, borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  candidate: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10 },
  candidateAmount: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  resultIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stateTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  stateText: { fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 420 },
  listNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 6, marginTop: 6 },
  footerWrap: { padding: 12, borderTopWidth: 1, gap: 9 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#2F4F3F',
  },
  footerLabel: { fontSize: 11, lineHeight: 15, fontWeight: '500', color: '#FFFFFF', opacity: 0.75 },
  footerTotal: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  footerHint: { fontSize: 12, lineHeight: 18, color: '#FFFFFF', opacity: 0.8, marginTop: 2 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: { fontSize: 13, lineHeight: 18, fontWeight: '600', flexShrink: 1 },
  quietButton: { minHeight: 28, paddingVertical: 3, paddingHorizontal: 4 },
  iconButton: { width: 36, padding: 0 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8, transform: [{ translateY: 1 }] },
});

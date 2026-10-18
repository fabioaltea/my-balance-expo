import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ThemedText } from '@/src/components/core/themed-text';
import InputGroup from '@/src/components/ui/input-group';
import { ExternalLink } from '@/src/components/utility/external-link';
import {
  ChatGptIntegrationApiHelper as Api,
  ChatGptIntegrationError,
  type ChatGptIntegrationStatus,
  type ChatGptModels,
} from '@/src/helpers/ChatGptIntegrationApiHelper';
import { useThemeColor } from '@/src/hooks/use-theme-color';

const labels = {
  connected: 'Collegato',
  permission_required: 'Permesso da concedere',
  reauth_required: 'Da ricollegare',
  disconnected: 'Disconnesso',
  revocation_pending: 'Revoca da confermare',
};

export default function ChatGptIntegrationSettings() {
  const [status, setStatus] = useState<ChatGptIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<ChatGptModels | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const alive = useRef(false);
  const actionController = useRef<AbortController | null>(null);
  const returnedFromOAuth = useRef(false);
  const secondary = useThemeColor({ light: '#657169', dark: '#AEB8B2' }, 'tabIconDefault');
  const surface = useThemeColor({ light: '#F2F5F3', dark: '#323A35' }, 'cardBackground');
  const background = useThemeColor({}, 'cardBackground');
  const text = useThemeColor({}, 'text');
  const accent = useThemeColor({ light: '#2F4F3F', dark: '#B8D9C5' }, 'tint');
  const danger = useThemeColor({ light: '#B42318', dark: '#FFB4AB' }, 'text');
  const active = status?.connections.find((item) => item.id === status.activeConnectionId);

  useEffect(() => {
    alive.current = true;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const result = url.searchParams.get('chatgpt_result');
      if (result) {
        if (result === 'error')
          setError(
            new ChatGptIntegrationError(
              url.searchParams.get('chatgpt_error') || 'CHATGPT_INVALID_ATTEMPT',
            ).message,
          );
        if (result === 'connected') returnedFromOAuth.current = true;
        if (result === 'permission_required')
          setNotice(
            'Account riconosciuto. Autorizza l’uso del piano per attivare le richieste AI.',
          );
        url.searchParams.delete('chatgpt_result');
        url.searchParams.delete('chatgpt_error');
        window.history.replaceState(window.history.state, '', url.toString());
      }
    }
    return () => {
      alive.current = false;
      actionController.current?.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Api.getStatus(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setStatus(value);
          if (returnedFromOAuth.current) {
            if (
              value.connections.some(
                (item) => item.id === value.activeConnectionId && item.planUsageEnabled,
              )
            )
              setNotice('Account ChatGPT collegato.');
            returnedFromOAuth.current = false;
          }
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof ChatGptIntegrationError
              ? cause.message
              : 'Impossibile verificare l’integrazione. Riprova.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    setCatalog(null);
    setLoadingModels(false);
    if (!active?.planUsageEnabled) return () => controller.abort();
    setLoadingModels(true);
    Api.models(active.id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setCatalog(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof ChatGptIntegrationError
              ? cause.message
              : 'Impossibile caricare i modelli.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingModels(false);
      });
    return () => controller.abort();
  }, [active?.id, active?.planUsageEnabled, revision]);

  const run = async (operation: (signal: AbortSignal) => Promise<void>) => {
    if (actionController.current) return;
    const controller = new AbortController();
    actionController.current = controller;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await operation(controller.signal);
    } catch (cause) {
      if (alive.current && !controller.signal.aborted) {
        setError(
          cause instanceof ChatGptIntegrationError
            ? cause.message
            : 'Operazione non riuscita. Riprova.',
        );
        setRevision((value) => value + 1);
      }
    } finally {
      actionController.current = null;
      if (alive.current) setBusy(false);
    }
  };

  const connect = (id?: string) =>
    run(async () => {
      const url = await Api.authorize(id);
      if (alive.current) window.location.assign(url);
    });
  const disconnect = (id: string) => {
    if (!window.confirm('Disconnettere questo account ChatGPT da MyBalance?')) return;
    void run(async () => {
      const confirmed = await Api.disconnect(id);
      if (!alive.current) return;
      setNotice(
        confirmed
          ? 'Account disconnesso.'
          : new ChatGptIntegrationError('CHATGPT_REVOCATION_PENDING').message,
      );
      setRevision((value) => value + 1);
    });
  };
  const disabled = busy || loading;
  const button = (label: string, action: () => void, isDisabled = false, destructive = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={action}
      style={[styles.button, { backgroundColor: surface, opacity: isDisabled ? 0.5 : 1 }]}
    >
      <ThemedText style={[styles.buttonText, { color: destructive ? danger : accent }]}>
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <InputGroup>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <ThemedText style={styles.title}>ChatGPT</ThemedText>
            <ThemedText style={[styles.note, { color: secondary }]}>
              Il tuo piano per le funzioni AI
            </ThemedText>
          </View>
          {(loading || busy) && <ActivityIndicator size="small" color={accent} />}
          <ThemedText
            accessibilityLiveRegion="polite"
            style={[styles.badge, { color: secondary, backgroundColor: surface }]}
          >
            {loading
              ? 'Verifica in corso'
              : !status
                ? 'Stato non disponibile'
                : !status.available
                  ? 'Da attivare'
                  : active
                    ? labels[active.status]
                    : 'Non collegato'}
          </ThemedText>
        </View>
        <ThemedText style={styles.description}>
          Autorizza MyBalance a usare il tuo piano ChatGPT per le funzioni AI compatibili. L’accesso
          a MyBalance continua con Google. Le richieste sono soggette ai permessi e ai limiti del
          tuo piano.
        </ThemedText>
        {status && !status.available && (
          <ThemedText style={[styles.note, { color: secondary }]}>
            Il collegamento non è ancora disponibile su questa istanza di MyBalance.
          </ThemedText>
        )}
        {status?.connections.map((connection) => (
          <View key={connection.id} style={[styles.account, { borderColor: surface }]}>
            <View style={styles.heading}>
              <ThemedText style={styles.accountLabel}>{connection.label}</ThemedText>
              <ThemedText style={[styles.note, { color: secondary }]}>
                {connection.email || 'Account ChatGPT'} · {connection.id.slice(0, 8)}
              </ThemedText>
              <ThemedText style={[styles.note, { color: secondary }]}>
                {labels[connection.status]}
                {connection.id === active?.id ? ' · Account attivo' : ''}
              </ThemedText>
            </View>
            <View style={styles.actions}>
              {connection.planUsageEnabled &&
                connection.id !== active?.id &&
                button(
                  'Usa account',
                  () => {
                    void run(async () => {
                      const value = await Api.select(connection.id);
                      if (alive.current) setStatus(value);
                    });
                  },
                  disabled,
                )}
              {connection.status !== 'revocation_pending' &&
                button(
                  'Ricollega',
                  () => {
                    void connect(connection.id);
                  },
                  disabled,
                )}
              {connection.status !== 'disconnected' &&
                button(
                  connection.status === 'revocation_pending' ? 'Riprova revoca' : 'Disconnetti',
                  () => disconnect(connection.id),
                  disabled,
                  true,
                )}
            </View>
          </View>
        ))}
        <View style={styles.actions}>
          {button(
            status?.connections.length ? 'Aggiungi account' : 'Continue with ChatGPT',
            () => {
              void connect();
            },
            disabled || !status?.available,
          )}
          {button(
            'Aggiorna',
            () => {
              setError(null);
              setRevision((value) => value + 1);
            },
            disabled,
          )}
          <ExternalLink
            href="https://chatgpt.com/settings/usage"
            style={[styles.link, { color: accent }]}
          >
            Gestisci utilizzo ↗
          </ExternalLink>
        </View>
        {active?.planUsageEnabled && (
          <View style={styles.modelSection}>
            <ThemedText style={styles.accountLabel}>Modello</ThemedText>
            {loadingModels ? (
              <ActivityIndicator size="small" color={accent} />
            ) : catalog?.connectionId === active.id && catalog.models.length ? (
              <>
                <Picker
                  accessibilityLabel="Modello ChatGPT"
                  selectedValue={catalog.selectedModel || ''}
                  enabled={!disabled}
                  style={[styles.picker, { color: text, backgroundColor: background }]}
                  onValueChange={(value: string) => {
                    void run(async () => {
                      await Api.setModel(active.id, value);
                      if (alive.current)
                        setCatalog((current) =>
                          current?.connectionId === active.id
                            ? { ...current, selectedModel: value }
                            : current,
                        );
                    });
                  }}
                >
                  {catalog.models.map((model) => (
                    <Picker.Item key={model.slug} value={model.slug} label={model.displayName} />
                  ))}
                </Picker>
                <ThemedText style={[styles.note, { color: secondary }]}>
                  Le richieste utilizzano il tuo piano ChatGPT.
                </ThemedText>
                {button(
                  'Prova collegamento',
                  () => {
                    void run(async (signal) => {
                      const output = await Api.test(active.id, catalog.selectedModel!, signal);
                      if (alive.current) setNotice(output);
                    });
                  },
                  disabled || !catalog.selectedModel || !active.welcomeAcknowledged,
                )}
                <ThemedText style={[styles.note, { color: secondary }]}>
                  La prova invia una breve richiesta e consuma utilizzo del piano.
                </ThemedText>
              </>
            ) : (
              <ThemedText style={[styles.note, { color: secondary }]}>
                Nessun modello disponibile. Aggiorna o verifica i permessi dell’account.
              </ThemedText>
            )}
          </View>
        )}
        {error && (
          <ThemedText accessibilityRole="alert" style={[styles.note, { color: danger }]}>
            {error}
          </ThemedText>
        )}
        {notice && (
          <ThemedText accessibilityLiveRegion="polite" style={[styles.note, { color: accent }]}>
            {notice}
          </ThemedText>
        )}
        <ExternalLink
          href="https://developers.openai.com/siwc/quickstart"
          style={[styles.link, { color: accent }]}
        >
          Come funziona ↗
        </ExternalLink>
      </View>
      <Modal
        visible={!!active?.planUsageEnabled && !active?.welcomeAcknowledged}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (active)
            void run(async () => {
              const value = await Api.acknowledge(active.id);
              if (alive.current) setStatus(value);
            });
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            accessibilityViewIsModal
            style={[styles.modalContent, { backgroundColor: background }]}
          >
            <ThemedText accessibilityRole="header" style={styles.title}>
              Stai usando il tuo piano ChatGPT
            </ThemedText>
            <ThemedText style={styles.description}>
              Le richieste AI compatibili in MyBalance useranno il tuo piano ChatGPT. Puoi
              controllare utilizzo e permessi nelle impostazioni ChatGPT.
            </ThemedText>
            {button(
              'Ho capito',
              () => {
                if (active)
                  void run(async () => {
                    const value = await Api.acknowledge(active.id);
                    if (alive.current) setStatus(value);
                  });
              },
              busy,
            )}
            {error && (
              <ThemedText accessibilityRole="alert" style={[styles.note, { color: danger }]}>
                {error}
              </ThemedText>
            )}
          </View>
        </View>
      </Modal>
    </InputGroup>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 14, paddingHorizontal: 4, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  heading: { flexGrow: 1, flexShrink: 1, gap: 3 },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '600' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  description: { fontSize: 15, lineHeight: 23, maxWidth: 680 },
  note: { fontSize: 13, lineHeight: 20, maxWidth: 680 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  button: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-start' },
  buttonText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  link: { fontSize: 14, lineHeight: 24, paddingVertical: 8, textDecorationLine: 'underline' },
  account: { borderTopWidth: 1, paddingTop: 14, gap: 10 },
  accountLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  modelSection: { gap: 10 },
  picker: { minHeight: 44, borderRadius: 8, width: '100%' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: { width: '100%', maxWidth: 480, borderRadius: 20, padding: 24, gap: 20 },
});

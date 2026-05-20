import { View, StyleSheet, ActivityIndicator, Alert, Pressable } from 'react-native';
import React, { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import ModalPanel from './modal-panel.native';
import { ThemedText } from '../core/themed-text.native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { SaltEdgeApiHelper, type SaltEdgeConnection } from '@/src/helpers/SaltEdgeApiHelper';
import type { Account } from '@/src/types/models';

interface SaltEdgePanelProps {
  isVisible: boolean;
  onClose: () => void;
  onConnectionChanged: () => void;
  account: Account;
  spreadsheetId: string;
}

type Step = 'idle' | 'connecting' | 'waiting_link' | 'syncing' | 'disconnecting';

const SaltEdgePanel: React.FC<SaltEdgePanelProps> = ({
  isVisible,
  onClose,
  onConnectionChanged,
  account,
  spreadsheetId,
}) => {
  const [step, setStep] = useState<Step>('idle');
  const [connection, setConnection] = useState<SaltEdgeConnection | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<{ imported: number } | null>(null);

  const primaryColor = useThemeColor({}, 'tint');
  const dangerColor = '#FF3B30';
  const textColor = useThemeColor({}, 'text');
  const subtleColor = useThemeColor({ light: '#8E8E93', dark: '#636366' }, 'tabIconDefault');

  const isConnected = !!account.saltedgeConnectionId || connection?.status === 'active';

  const pollConnection = useCallback(
    async (maxAttempts = 10): Promise<SaltEdgeConnection | null> => {
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const conn = await SaltEdgeApiHelper.getConnection(spreadsheetId, account.accountId);
        if (conn?.connectionId) return conn;
      }
      return null;
    },
    [spreadsheetId, account.accountId],
  );

  const handleConnect = async () => {
    setStep('connecting');
    try {
      const returnTo = Linking.createURL('saltedge/callback', {
        queryParams: { accountId: account.accountId },
      });
      const connectUrl = await SaltEdgeApiHelper.connect(
        spreadsheetId,
        account.accountId,
        returnTo,
      );
      if (!connectUrl) {
        Alert.alert('Errore', 'Impossibile avviare la connessione bancaria.');
        setStep('idle');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(connectUrl, returnTo);

      setStep('waiting_link');

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const connectionId = parsed.queryParams?.connection_id as string | undefined;
        const saltedgeAccountId = parsed.queryParams?.account_id as string | undefined;

        if (connectionId && saltedgeAccountId) {
          await SaltEdgeApiHelper.link(
            spreadsheetId,
            account.accountId,
            connectionId,
            saltedgeAccountId,
          );
          onConnectionChanged();
          setStep('idle');
          return;
        }
      }

      // Fallback: widget didn't pass params in redirect — poll webhook result
      const conn = await pollConnection();
      if (conn) {
        setConnection(conn);
        onConnectionChanged();
      } else {
        Alert.alert(
          'Connessione in corso',
          'La connessione bancaria è in elaborazione. Riprova tra qualche momento.',
        );
      }
    } catch (e) {
      Alert.alert('Errore', 'Si è verificato un errore durante la connessione.');
    } finally {
      setStep('idle');
    }
  };

  const handleReconnect = async () => {
    setStep('connecting');
    try {
      const returnTo = Linking.createURL('saltedge/callback', {
        queryParams: { accountId: account.accountId },
      });
      const connectUrl = await SaltEdgeApiHelper.reconnect(spreadsheetId, account.accountId);
      if (!connectUrl) {
        Alert.alert('Errore', 'Impossibile avviare la riconnessione.');
        setStep('idle');
        return;
      }
      await WebBrowser.openAuthSessionAsync(connectUrl, returnTo);
      const conn = await pollConnection(5);
      if (conn) {
        setConnection(conn);
        onConnectionChanged();
      }
    } catch (e) {
      Alert.alert('Errore', 'Si è verificato un errore durante la riconnessione.');
    } finally {
      setStep('idle');
    }
  };

  const handleSync = async () => {
    setStep('syncing');
    try {
      const result = await SaltEdgeApiHelper.sync(spreadsheetId, account.accountId);
      if (result) {
        setLastSyncResult({ imported: result.imported });
        onConnectionChanged();
      } else {
        Alert.alert('Errore', 'Sincronizzazione fallita.');
      }
    } catch (e) {
      Alert.alert('Errore', 'Si è verificato un errore durante la sincronizzazione.');
    } finally {
      setStep('idle');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnetti banca',
      `Vuoi disconnettere "${account.name}" dal conto bancario? Le transazioni importate non verranno eliminate.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Disconnetti',
          style: 'destructive',
          onPress: async () => {
            setStep('disconnecting');
            try {
              const ok = await SaltEdgeApiHelper.disconnect(spreadsheetId, account.accountId);
              if (ok) {
                setConnection(null);
                setLastSyncResult(null);
                onConnectionChanged();
              } else {
                Alert.alert('Errore', 'Impossibile disconnettere il conto bancario.');
              }
            } catch (e) {
              Alert.alert('Errore', 'Si è verificato un errore durante la disconnessione.');
            } finally {
              setStep('idle');
            }
          },
        },
      ],
    );
  };

  const busy = step !== 'idle';

  const statusLabel = (() => {
    const s = account.saltedgeStatus ?? connection?.status;
    if (!isConnected) return null;
    if (s === 'error') return { text: 'Errore connessione', color: dangerColor };
    if (s === 'inactive') return { text: 'Inattivo', color: subtleColor };
    return { text: 'Connesso', color: '#34C759' };
  })();

  return (
    <ModalPanel
      isVisible={isVisible}
      onClose={onClose}
      showConfirmButton={false}
      showCancelButton={false}
      title="Sincronizzazione bancaria"
    >
      <View style={styles.container}>
        {/* Account info row */}
        <View style={styles.accountRow}>
          <View style={[styles.dot, { backgroundColor: account.color || '#2F4F3F' }]} />
          <ThemedText style={styles.accountName}>{account.name}</ThemedText>
          {statusLabel && (
            <View style={[styles.statusBadge, { backgroundColor: statusLabel.color + '22' }]}>
              <ThemedText style={[styles.statusText, { color: statusLabel.color }]}>
                {statusLabel.text}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Last sync result */}
        {lastSyncResult && (
          <ThemedText style={[styles.hint, { color: subtleColor }]}>
            {lastSyncResult.imported} transazioni importate
          </ThemedText>
        )}

        {/* Step feedback */}
        {busy && (
          <View style={styles.busyRow}>
            <ActivityIndicator size="small" color={primaryColor} />
            <ThemedText style={[styles.hint, { color: subtleColor, marginLeft: 8 }]}>
              {step === 'connecting' && 'Apertura widget bancario…'}
              {step === 'waiting_link' && 'Attendendo collegamento…'}
              {step === 'syncing' && 'Sincronizzazione in corso…'}
              {step === 'disconnecting' && 'Disconnessione in corso…'}
            </ThemedText>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {!isConnected ? (
            <ActionButton
              icon="account-balance"
              label="Connetti banca"
              color={primaryColor}
              onPress={handleConnect}
              disabled={busy}
            />
          ) : (
            <>
              <ActionButton
                icon="sync"
                label="Sincronizza transazioni"
                color={primaryColor}
                onPress={handleSync}
                disabled={busy}
              />
              {account.saltedgeStatus === 'error' && (
                <ActionButton
                  icon="refresh"
                  label="Riconnetti"
                  color="#FF9500"
                  onPress={handleReconnect}
                  disabled={busy}
                />
              )}
              <ActionButton
                icon="link-off"
                label="Disconnetti banca"
                color={dangerColor}
                onPress={handleDisconnect}
                disabled={busy}
              />
            </>
          )}
        </View>
      </View>
    </ModalPanel>
  );
};

interface ActionButtonProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, color, onPress, disabled }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
  >
    <MaterialIcons name={icon as any} size={22} color={color} />
    <ThemedText style={[styles.actionLabel, { color }]}>{label}</ThemedText>
  </Pressable>
);

export default SaltEdgePanel;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    minHeight: 160,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 10,
  },
  accountName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    marginBottom: 8,
  },
  actions: {
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    opacity: 1,
  },
  actionButtonPressed: {
    opacity: 0.5,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});

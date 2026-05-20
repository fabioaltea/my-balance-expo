import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import ModalPanel from './modal-panel.native';
import TextBox from './text-box.native';
import CurrencyInput from './currency-input';
import { COLOR_PALETTE } from '@/src/constants/colors';
import { ThemedText } from '../core/themed-text.native';
import { MaterialIcons } from '@expo/vector-icons';
import { SaltEdgeApiHelper } from '@/src/helpers/SaltEdgeApiHelper';
import type { Account } from '@/src/types/models';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface AccountModalData {
  name: string;
  color: string;
  balance: number;
}

interface AccountModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (data: AccountModalData) => void;
  title?: string;
  initialData?: { name: string; color: string; balance?: number };
  balanceEditable?: boolean;
  account?: Account;
  spreadsheetId?: string | null;
  onConnectionChanged?: () => void;
}

type SaltEdgeStep = 'idle' | 'connecting' | 'waiting' | 'syncing' | 'disconnecting';

const AccountModal: React.FC<AccountModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  title = 'Account',
  initialData,
  balanceEditable = false,
  account,
  spreadsheetId,
  onConnectionChanged,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [balance, setBalance] = useState(0);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [saltEdgeStep, setSaltEdgeStep] = useState<SaltEdgeStep>('idle');

  useEffect(() => {
    if (isVisible) {
      setName(initialData?.name ?? '');
      setColor(initialData?.color ?? COLOR_PALETTE[0]);
      setBalance(initialData?.balance ?? 0);
      setShowKeyboard(false);
      setSaltEdgeStep('idle');
    }
  }, [isVisible, initialData]);

  const handleConfirm = () => {
    if (!name.trim()) return;
    onConfirm({ name: name.trim(), color, balance });
  };

  const formatBalance = (amount: number): string => {
    return amount.toFixed(2).replace('.', ',') + ' €';
  };

  const isConnected = !!account?.saltedgeConnectionId;
  const saltEdgeBusy = saltEdgeStep !== 'idle';

  const pollConnection = async (maxAttempts = 10) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      if (!account || !spreadsheetId) break;
      const conn = await SaltEdgeApiHelper.getConnection(spreadsheetId, account.accountId);
      if (conn?.connectionId) return conn;
    }
    return null;
  };

  const handleConnect = async () => {
    if (!account || !spreadsheetId) return;
    setSaltEdgeStep('connecting');
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
        setSaltEdgeStep('idle');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(connectUrl, returnTo);
      setSaltEdgeStep('waiting');

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
          onConnectionChanged?.();
          setSaltEdgeStep('idle');
          return;
        }
      }

      const conn = await pollConnection();
      if (conn) {
        onConnectionChanged?.();
      } else {
        Alert.alert(
          'Connessione in corso',
          'La connessione bancaria è in elaborazione. Riprova tra qualche momento.',
        );
      }
    } catch {
      Alert.alert('Errore', 'Si è verificato un errore durante la connessione.');
    } finally {
      setSaltEdgeStep('idle');
    }
  };

  const handleSync = async () => {
    if (!account || !spreadsheetId) return;
    setSaltEdgeStep('syncing');
    try {
      const result = await SaltEdgeApiHelper.sync(spreadsheetId, account.accountId);
      if (result) {
        onConnectionChanged?.();
        Alert.alert('Sincronizzato', `${result.imported} transazioni importate.`);
      } else {
        Alert.alert('Errore', 'Sincronizzazione fallita.');
      }
    } catch {
      Alert.alert('Errore', 'Errore durante la sincronizzazione.');
    } finally {
      setSaltEdgeStep('idle');
    }
  };

  const handleDisconnect = () => {
    if (!account || !spreadsheetId) return;
    Alert.alert(
      'Disconnetti banca',
      'Vuoi disconnettere questo conto dal tuo istituto bancario? Le transazioni importate non verranno eliminate.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Disconnetti',
          style: 'destructive',
          onPress: async () => {
            setSaltEdgeStep('disconnecting');
            try {
              const ok = await SaltEdgeApiHelper.disconnect(spreadsheetId, account.accountId);
              if (ok) {
                onConnectionChanged?.();
              } else {
                Alert.alert('Errore', 'Impossibile disconnettere il conto bancario.');
              }
            } catch {
              Alert.alert('Errore', 'Errore durante la disconnessione.');
            } finally {
              setSaltEdgeStep('idle');
            }
          },
        },
      ],
    );
  };

  const saltEdgeStatusColor = (() => {
    if (!isConnected) return '#8E8E93';
    if (account?.saltedgeStatus === 'error') return '#FF3B30';
    if (account?.saltedgeStatus === 'inactive') return '#FF9500';
    return '#34C759';
  })();

  const saltEdgeStatusLabel = (() => {
    if (!isConnected) return 'Non collegato';
    if (account?.saltedgeStatus === 'error') return 'Errore';
    if (account?.saltedgeStatus === 'inactive') return 'Inattivo';
    return 'Collegato';
  })();

  return (
    <ModalPanel
      isVisible={isVisible}
      onClose={onClose}
      onConfirm={name.trim() ? handleConfirm : undefined}
      title={title}
      maxHeight={SCREEN_HEIGHT * 0.95}
    >
      <View style={{ minHeight: 400 }}>
        <View style={{ height: 200 }}>
          <TextBox
            value={name}
            onChange={setName}
            label="Name"
            placeholder="e.g. Checking Account"
          />

          {balanceEditable && (
            <Pressable onPress={() => setShowKeyboard(true)} style={styles.inputRow}>
              <ThemedText style={styles.label}>Balance</ThemedText>
              <ThemedText style={styles.balanceText}>{formatBalance(balance)}</ThemedText>
            </Pressable>
          )}

          <View style={styles.inputRow}>
            <ThemedText style={styles.label}>Color</ThemedText>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorScrollView}
          contentContainerStyle={styles.colorScrollContent}
        >
          {COLOR_PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorItem,
                { backgroundColor: c },
                color === c && styles.selectedColorItem,
              ]}
            />
          ))}
        </ScrollView>

        {/* SaltEdge section — only in edit mode (account provided) */}
        {account && spreadsheetId && (
          <View style={styles.saltEdgeSection}>
            <View style={styles.saltEdgeHeader}>
              <ThemedText style={styles.sectionTitle}>Sincronizzazione bancaria</ThemedText>
              <View style={[styles.statusDot, { backgroundColor: saltEdgeStatusColor }]} />
              <ThemedText style={[styles.statusLabel, { color: saltEdgeStatusColor }]}>
                {saltEdgeStatusLabel}
              </ThemedText>
            </View>

            {saltEdgeBusy ? (
              <View style={styles.busyRow}>
                <ActivityIndicator size="small" color="#007AFF" />
                <ThemedText style={styles.busyLabel}>
                  {saltEdgeStep === 'connecting' && 'Apertura widget bancario…'}
                  {saltEdgeStep === 'waiting' && 'Attendendo collegamento…'}
                  {saltEdgeStep === 'syncing' && 'Sincronizzazione in corso…'}
                  {saltEdgeStep === 'disconnecting' && 'Disconnessione in corso…'}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.saltEdgeActions}>
                {!isConnected ? (
                  <SaltEdgeActionButton
                    icon="account-balance"
                    label="Connetti banca"
                    color="#007AFF"
                    onPress={handleConnect}
                  />
                ) : (
                  <>
                    <SaltEdgeActionButton
                      icon="sync"
                      label="Sincronizza transazioni"
                      color="#007AFF"
                      onPress={handleSync}
                    />
                    {account.saltedgeStatus === 'error' && (
                      <SaltEdgeActionButton
                        icon="refresh"
                        label="Riconnetti"
                        color="#FF9500"
                        onPress={async () => {
                          if (!spreadsheetId) return;
                          setSaltEdgeStep('connecting');
                          try {
                            const url = await SaltEdgeApiHelper.reconnect(
                              spreadsheetId,
                              account.accountId,
                            );
                            if (url) {
                              await WebBrowser.openAuthSessionAsync(url, '');
                              const conn = await pollConnection(5);
                              if (conn) onConnectionChanged?.();
                            }
                          } finally {
                            setSaltEdgeStep('idle');
                          }
                        }}
                      />
                    )}
                    <SaltEdgeActionButton
                      icon="link-off"
                      label="Disconnetti banca"
                      color="#FF3B30"
                      onPress={handleDisconnect}
                    />
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {showKeyboard && (
        <ModalPanel
          isVisible={showKeyboard}
          onClose={() => setShowKeyboard(false)}
          onConfirm={() => setShowKeyboard(false)}
          title="Edit Balance"
          maxHeight={SCREEN_HEIGHT * 0.5}
        >
          <CurrencyInput value={balance} onChange={setBalance} showConfirmButton={false} />
        </ModalPanel>
      )}
    </ModalPanel>
  );
};

interface SaltEdgeActionButtonProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

const SaltEdgeActionButton: React.FC<SaltEdgeActionButtonProps> = ({
  icon,
  label,
  color,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.5 }]}
  >
    <MaterialIcons name={icon as any} size={20} color={color} />
    <ThemedText style={[styles.actionLabel, { color }]}>{label}</ThemedText>
  </Pressable>
);

export default AccountModal;

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    minWidth: 80,
  },
  balanceText: {
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'right',
    flex: 1,
  },
  colorScrollView: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  colorScrollContent: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  colorItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  selectedColorItem: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  saltEdgeSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
    marginTop: 4,
  },
  saltEdgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  busyLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  saltEdgeActions: {
    gap: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});

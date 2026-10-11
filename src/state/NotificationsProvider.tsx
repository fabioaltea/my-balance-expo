import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useAuthContext } from './AuthProvider';
import { queryClient } from '../providers/QueryProvider';
import { QUERY_KEYS } from '../constants/queryKeys';
import { NotificationsHelpers } from '../helpers/NotificationsHelpers';
import { NotificationsCoordinator } from '../helpers/NotificationsCoordinator';
import { PushApiHelper } from '../helpers/PushApiHelper';
import { AuthStorageHelper } from '../helpers/AuthStorageHelper';
import { LogoutQueueHelper } from '../helpers/LogoutQueueHelper';
import { NotificationSessionHelper } from '../helpers/NotificationSessionHelper';
import { HttpHelper } from '../helpers/HttpHelper';
import { TransactionsApiHelper } from '../helpers/TransactionsApiHelper';
import { movementNotification } from '../types/notifications';
import type {
  NotificationState,
  NotificationPreference,
  MovementNotification,
} from '../types/notifications';

const initial: NotificationState = {
  enabled: false,
  registered: false,
  permission: 'undetermined',
  syncStatus: 'idle',
  error: null,
};
interface Context extends NotificationState {
  supported: boolean;
  effectiveEnabled: boolean;
  toggle(enabled: boolean): Promise<void>;
  retry(): Promise<void>;
}
const NotificationsContext = createContext<Context | null>(null);
export function useNotifications() {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('NotificationsProvider missing');
  return value;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthContext();
  const [state, setState] = useState(initial);
  const coordinator = useRef<NotificationsCoordinator | null>(null);
  const current = useRef(auth);
  current.current = auth;
  const epoch = useRef(0);
  const pending = useRef<{ data: MovementNotification; id: string } | null>(null);
  const consumed = useRef(new Set<string>());
  const navigating = useRef(false);
  const invalidateEpoch = useCallback(() => {
    epoch.current++;
  }, []);

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aggregations.all }),
    ]);
  }, []);
  const navigate = useCallback(async (): Promise<void> => {
    const event = pending.current;
    const snapshot = current.current;
    const generation = epoch.current;
    if (
      !event ||
      navigating.current ||
      !snapshot.isAuthenticated ||
      snapshot.isLoading ||
      !snapshot.dashboardReady ||
      !snapshot.selectedSpreadsheetId ||
      !snapshot.user
    )
      return;
    navigating.current = true;
    try {
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        snapshot.user.email,
      );
      if (epoch.current !== generation || pending.current?.id !== event.id) return;
      if (
        event.data.recipientHash !== hash ||
        event.data.spreadsheetId !== snapshot.selectedSpreadsheetId
      ) {
        pending.current = null;
        consumed.current.add(event.id);
        await NotificationsHelpers.clearLastResponse();
        return;
      }
      const result = await HttpHelper.get(
        `/movements/${encodeURIComponent(event.data.movementId)}?spreadsheet_id=${encodeURIComponent(snapshot.selectedSpreadsheetId)}`,
      );
      if (epoch.current !== generation || current.current.user?.email !== snapshot.user.email)
        return;
      if (!result.success || !result.data || result.data.status === 'DELETED')
        throw new Error('Movimento non disponibile');
      // Populate the same query used by DataProvider before opening the existing edit screen.
      const transactions = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.transactions.filtered(),
        staleTime: 0,
        queryFn: async () => {
          const raw = await TransactionsApiHelper.getTransactions(snapshot.selectedSpreadsheetId!);
          if (epoch.current !== generation) throw new Error('Session changed');
          return raw.map(TransactionsApiHelper.rawToTransactionData);
        },
      });
      if (epoch.current !== generation || !current.current.isAuthenticated) return;
      if (!transactions.some((t) => t.movementId === event.data.movementId))
        throw new Error('Movement data not loaded');
      if (pending.current?.id !== event.id) return;
      pending.current = null;
      consumed.current.add(event.id);
      await NotificationsHelpers.clearLastResponse();
      if (epoch.current !== generation) return;
      router.push({ pathname: '/add', params: { movementId: event.data.movementId } });
    } catch {
      if (epoch.current === generation && pending.current?.id === event.id) {
        pending.current = null;
        consumed.current.add(event.id);
        void NotificationsHelpers.clearLastResponse().catch(() => undefined);
        Alert.alert(
          'MyBalance',
          'Il movimento non è disponibile. Puoi controllare i movimenti da confermare nella Home.',
        );
      }
    } finally {
      navigating.current = false;
      if (pending.current && current.current.dashboardReady && !current.current.isLoading)
        void navigate();
    }
  }, []);

  useEffect(() => {
    if (!NotificationsHelpers.supported) return;
    return NotificationsHelpers.listen(
      (data: unknown) => {
        const event = movementNotification(data);
        const snapshot = current.current;
        if (
          !event ||
          !snapshot.isAuthenticated ||
          event.spreadsheetId !== snapshot.selectedSpreadsheetId ||
          !snapshot.user
        )
          return;
        const generation = epoch.current;
        void Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, snapshot.user.email)
          .then((hash) => {
            if (generation === epoch.current && hash === event.recipientHash) return invalidate();
          })
          .catch(() => undefined);
      },
      (data: unknown, id: string) => {
        const event = movementNotification(data);
        if (!event || consumed.current.has(id)) return;
        pending.current = { data: event, id };
        void navigate();
      },
      () => {
        void coordinator.current?.reconcile();
      },
      async (data) => {
        const event = movementNotification(data);
        const snapshot = current.current;
        if (!event || !snapshot.isAuthenticated || snapshot.isLoading || !snapshot.user)
          return false;
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          snapshot.user.email,
        );
        return (
          current.current.user?.email === snapshot.user.email &&
          current.current.isAuthenticated &&
          event.recipientHash === hash
        );
      },
    );
  }, [invalidate, navigate]);

  useEffect(() => {
    const generation = ++epoch.current;
    coordinator.current?.stop();
    coordinator.current = null;
    setState(initial);
    const email = auth.isAuthenticated ? auth.user?.email : undefined;
    if (!email || !NotificationsHelpers.supported) return;
    let active: NotificationsCoordinator | null = null;
    void (async () => {
      const deviceId = await AuthStorageHelper.getOrCreateDeviceId();
      if (epoch.current !== generation) return;
      const key = `push-preference-v1:${NotificationsHelpers.appVariant}:${deviceId}:${email}`;
      active = new NotificationsCoordinator({
        permission: (request) => NotificationsHelpers.permission(request),
        token: () => NotificationsHelpers.token(),
        get: () => PushApiHelper.get(),
        register: (token, permission, intent) => PushApiHelper.register(token, permission, intent),
        disable: () => PushApiHelper.disable(),
        read: async () => {
          const value = await AsyncStorage.getItem(key);
          if (!value) return null;
          try {
            const preference = JSON.parse(value);
            if (typeof preference.enabled !== 'boolean' || typeof preference.pending !== 'boolean')
              throw new Error();
            return preference as NotificationPreference;
          } catch {
            throw new Error('Preferenza notifiche non leggibile: riprova dalle impostazioni');
          }
        },
        save: (preference) => AsyncStorage.setItem(key, JSON.stringify(preference)),
        changed: (value) => {
          if (epoch.current === generation) setState(value);
        },
      });
      coordinator.current = active;
      await active.reconcile();
    })().catch((error) => {
      if (epoch.current === generation)
        setState({ ...initial, syncStatus: 'error', error: error.message });
    });
    return () => {
      invalidateEpoch();
      active?.stop();
    };
  }, [auth.isAuthenticated, auth.user?.email, invalidateEpoch]);

  useEffect(
    () =>
      NotificationSessionHelper.subscribe(() => {
        epoch.current++;
        coordinator.current?.stop();
        coordinator.current = null;
        pending.current = null;
        setState(initial);
      }),
    [],
  );

  useEffect(() => {
    const retry = () => {
      void LogoutQueueHelper.retry().catch(() => undefined);
      void coordinator.current?.reconcile();
      void navigate();
    };
    retry();
    const subscription = AppState.addEventListener('change', (value) => {
      if (value === 'active') retry();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') retry();
    }, 60000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [navigate]);
  useEffect(() => {
    void navigate();
  }, [
    auth.dashboardReady,
    auth.selectedSpreadsheetId,
    auth.isAuthenticated,
    auth.isLoading,
    navigate,
  ]);

  const value: Context = {
    ...state,
    supported: NotificationsHelpers.supported,
    effectiveEnabled:
      state.enabled && state.registered && ['granted', 'provisional'].includes(state.permission),
    toggle: async (enabled) => {
      await coordinator.current?.toggle(enabled);
    },
    retry: async () => {
      await coordinator.current?.reconcile();
    },
  };
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

import type {
  NotificationPermission,
  NotificationPreference,
  NotificationState,
  PushDeviceState,
} from '../types/notifications';

export interface NotificationsDependencies {
  permission(request: boolean): Promise<NotificationPermission>;
  token(): Promise<string>;
  get(): Promise<PushDeviceState>;
  register(
    token: string | null,
    permission: NotificationPermission,
    intent: 'enable' | 'reconcile' | 'restoreLegacy' | 'claim',
  ): Promise<PushDeviceState>;
  disable(): Promise<PushDeviceState>;
  read(): Promise<NotificationPreference | null>;
  save(preference: NotificationPreference): Promise<void>;
  changed(state: NotificationState): void;
}
export class NotificationsCoordinator {
  state: NotificationState = {
    enabled: false,
    registered: false,
    permission: 'undetermined',
    syncStatus: 'idle',
    error: null,
  };
  private stopped = false;
  private queue: Promise<void> = Promise.resolve();
  constructor(private dependencies: NotificationsDependencies) {}
  stop() {
    this.stopped = true;
  }
  private publish(values: Partial<NotificationState>) {
    if (!this.stopped) {
      this.state = { ...this.state, ...values };
      this.dependencies.changed(this.state);
    }
  }
  private ensureCurrent() {
    if (this.stopped) throw new Error('Sessione notifiche terminata');
  }
  private serialize(work: () => Promise<void>) {
    const task = this.queue.then(async () => {
      if (this.stopped) return;
      this.publish({ syncStatus: 'syncing', error: null });
      try {
        await work();
        this.publish({ syncStatus: 'idle', error: null });
      } catch (error) {
        this.publish({
          syncStatus: 'error',
          error: error instanceof Error ? error.message : 'Sincronizzazione non riuscita',
        });
      }
    });
    this.queue = task.catch(() => undefined);
    return task;
  }
  private async apply(server: PushDeviceState, permission: NotificationPermission) {
    this.ensureCurrent();
    await this.dependencies.save({ enabled: server.enabled, pending: false });
    this.ensureCurrent();
    this.publish({ enabled: server.enabled, registered: server.registered, permission });
  }
  toggle(enabled: boolean) {
    return this.serialize(async () => {
      await this.dependencies.save({ enabled, pending: true });
      this.ensureCurrent();
      if (!enabled) {
        this.publish({ enabled: false, registered: false });
        const result = await this.dependencies.disable();
        await this.apply(result, this.state.permission);
        return;
      }
      const permission = await this.dependencies.permission(true);
      this.ensureCurrent();
      this.publish({ permission });
      if (!['granted', 'provisional'].includes(permission)) {
        await this.dependencies.save({ enabled: false, pending: false });
        throw new Error(
          'Permesso notifiche negato. Puoi abilitarlo nelle impostazioni del dispositivo.',
        );
      }
      const token = await this.dependencies.token();
      this.ensureCurrent();
      await this.apply(await this.dependencies.register(token, permission, 'enable'), permission);
    });
  }
  reconcile() {
    return this.serialize(async () => {
      const preference = await this.dependencies.read();
      this.ensureCurrent();
      const permission = await this.dependencies.permission(false);
      this.ensureCurrent();
      this.publish({ permission });
      if (preference?.pending && !preference.enabled) {
        this.publish({ enabled: false, registered: false });
        await this.apply(await this.dependencies.disable(), permission);
        return;
      }
      const current = await this.dependencies.get();
      this.ensureCurrent();
      if (preference?.pending && preference.enabled) {
        if (!['granted', 'provisional'].includes(permission))
          throw new Error('Permesso notifiche non concesso');
        const token = await this.dependencies.token();
        this.ensureCurrent();
        await this.apply(await this.dependencies.register(token, permission, 'enable'), permission);
        return;
      }
      if (current.enabled) {
        const token = ['granted', 'provisional'].includes(permission)
          ? await this.dependencies.token()
          : null;
        this.ensureCurrent();
        await this.apply(
          await this.dependencies.register(token, permission, 'reconcile'),
          permission,
        );
        return;
      }
      // Legacy adoption is allowed only by a matching token. OS permission alone is never an opt-in.
      if (!preference && !current.updatedAt && ['granted', 'provisional'].includes(permission)) {
        const token = await this.dependencies.token();
        this.ensureCurrent();
        try {
          await this.apply(
            await this.dependencies.register(token, permission, 'restoreLegacy'),
            permission,
          );
          return;
        } catch (error) {
          if ((error as { code?: string }).code !== 'LEGACY_TOKEN_NOT_MATCHED') throw error;
          this.ensureCurrent();
          await this.apply(
            await this.dependencies.register(token, permission, 'claim'),
            permission,
          );
          return;
        }
      }
      await this.apply(current, permission);
    });
  }
}

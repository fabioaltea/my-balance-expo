// Synchronously stop provider work before auth credentials are cleared or logout requests begin.
export class NotificationSessionHelper {
  private static listeners = new Set<() => void>();
  static subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  static suspend() {
    this.listeners.forEach((listener) => listener());
  }
}

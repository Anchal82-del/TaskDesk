import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AppNotification } from '@app/notification.model';
import { AuthService } from '@app/auth';

const ITEMS_KEY = 'taskdesk_notifications';
const ENABLED_KEY = 'taskdesk_notifications_enabled';
const MAX_ITEMS = 30;

function isNotification(value: unknown): value is AppNotification {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item['id'] === 'number' && typeof item['message'] === 'string';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly auth = inject(AuthService);

  readonly enabled = signal<boolean>(this.readEnabled());
  readonly items = signal<AppNotification[]>([]);
  readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);

  constructor() {
    // Reload notifications from the active user's storage key whenever active user changes
    effect(() => {
      this.auth.currentUser();
      this.items.set(this.readItems());
    });
  }

  add(message: string): void {
    if (!this.enabled()) return;
    const now = Date.now();
    const next: AppNotification = { id: now + Math.random(), message, createdAt: now, read: false };
    this.items.set([next, ...this.items()].slice(0, MAX_ITEMS));
    this.persist();
  }

  // Adds a notification directly to another specific user's inbox
  addForUser(userId: number, message: string): void {
    if (!this.enabled()) return;
    const currentId = this.auth.getCurrentUser()?.id;
    if (currentId === userId) {
      this.add(message);
      return;
    }
    const now = Date.now();
    const next: AppNotification = { id: now + Math.random(), message, createdAt: now, read: false };
    const key = this.getStorageKey(userId);
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed.filter(isNotification) : [];
      localStorage.setItem(key, JSON.stringify([next, ...list].slice(0, MAX_ITEMS)));
    } catch {
      /* storage unavailable */
    }
  }

  markAllRead(): void {
    this.items.set(this.items().map((n) => ({ ...n, read: true })));
    this.persist();
  }

  clearAll(): void {
    this.items.set([]);
    this.persist();
  }

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    try {
      localStorage.setItem(ENABLED_KEY, String(value));
    } catch {
      /* storage unavailable */
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.items()));
    } catch {
      /* storage unavailable */
    }
  }

  private getStorageKey(userId?: number): string {
    const id = userId ?? this.auth.getCurrentUser()?.id;
    return id ? `${ITEMS_KEY}_user_${id}` : ITEMS_KEY;
  }

  private readItems(userId?: number): AppNotification[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey(userId));
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isNotification) : [];
    } catch {
      return [];
    }
  }

  private readEnabled(): boolean {
    try {
      return localStorage.getItem(ENABLED_KEY) !== 'false';
    } catch {
      return true;
    }
  }
}

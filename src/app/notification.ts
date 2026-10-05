import { computed, Injectable, signal } from '@angular/core';
import { AppNotification } from '@app/notification.model';

const ITEMS_KEY = 'taskdesk_notifications';
const ENABLED_KEY = 'taskdesk_notifications_enabled';
const MAX_ITEMS = 30;

function isNotification(value: unknown): value is AppNotification {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item['id'] === 'number' && typeof item['message'] === 'string';
}

// In-app notifications, kept in localStorage so they survive a refresh.
// No server needed; swap for an API later if you add a backend.
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  readonly enabled = signal<boolean>(this.readEnabled());
  readonly items = signal<AppNotification[]>(this.readItems());
  readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);

  add(message: string): void {
    if (!this.enabled()) return;
    const now = Date.now();
    const next: AppNotification = { id: now + Math.random(), message, createdAt: now, read: false };
    this.items.set([next, ...this.items()].slice(0, MAX_ITEMS));
    this.persist();
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
      localStorage.setItem(ITEMS_KEY, JSON.stringify(this.items()));
    } catch {
      /* storage unavailable */
    }
  }

  private readItems(): AppNotification[] {
    try {
      const raw = localStorage.getItem(ITEMS_KEY);
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

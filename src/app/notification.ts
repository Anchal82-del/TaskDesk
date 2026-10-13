import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, of, tap } from 'rxjs';
import { AppNotification } from '@app/notification.model';
import { AuthService } from '@app/auth';
import { environment } from '@env/environment';

const ITEMS_KEY = 'taskdesk_notifications';
const ENABLED_KEY = 'taskdesk_notifications_enabled';
const MAX_ITEMS = 30;

interface ApiResponse<T> {
  status: string;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

function isNotification(value: unknown): value is AppNotification {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item['id'] === 'number' && typeof item['message'] === 'string';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  readonly enabled = signal<boolean>(this.readEnabled());
  readonly items = signal<AppNotification[]>([]);
  readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Whenever current user changes, reload notifications
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.fetchNotifications().subscribe();
        this.startPolling();
      } else {
        this.stopPolling();
        this.items.set([]);
      }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private startPolling(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      if (this.auth.isLoggedIn() && (typeof document === 'undefined' || !document.hidden)) {
        this.fetchNotifications().subscribe();
      }
    }, 5000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  fetchNotifications() {
    if (!this.http || !this.auth.isLoggedIn()) {
      this.items.set(this.readLocalItems());
      return of(this.items());
    }

    return this.http
      .get<ApiResponse<AppNotification[]>>(this.baseUrl, {
        headers: this.getHeaders()
      })
      .pipe(
        map((res) => res.data || []),
        tap((remoteList) => {
          this.items.set(remoteList);
          this.persistLocal(remoteList);
        }),
        catchError(() => {
          this.items.set(this.readLocalItems());
          return of(this.items());
        })
      );
  }

  add(message: string): void {
    if (!this.enabled()) return;
    const now = Date.now();
    const next: AppNotification = { id: now + Math.random(), message, createdAt: now, read: false };
    this.items.set([next, ...this.items()].slice(0, MAX_ITEMS));
    this.persistLocal(this.items());
  }

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

  markAsRead(id: number): void {
    this.items.set(
      this.items().map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    this.persistLocal(this.items());

    if (this.http && this.auth.isLoggedIn()) {
      this.http
        .patch(`${this.baseUrl}/${id}/read`, {}, { headers: this.getHeaders() })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
  }

  markAllRead(): void {
    const hasUnread = this.items().some((n) => !n.read);
    if (!hasUnread) return;

    this.items.set(this.items().map((n) => ({ ...n, read: true })));
    this.persistLocal(this.items());

    if (this.http && this.auth.isLoggedIn()) {
      this.http
        .post(`${this.baseUrl}/mark-all-read`, {}, { headers: this.getHeaders() })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
  }

  clearAll(): void {
    this.items.set([]);
    this.persistLocal([]);

    if (this.http && this.auth.isLoggedIn()) {
      this.http
        .delete(this.baseUrl, { headers: this.getHeaders() })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
  }

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    try {
      localStorage.setItem(ENABLED_KEY, String(value));
    } catch {
      /* storage unavailable */
    }
  }

  private persistLocal(list: AppNotification[]): void {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(list));
    } catch {
      /* storage unavailable */
    }
  }

  private getStorageKey(userId?: number): string {
    const id = userId ?? this.auth.getCurrentUser()?.id;
    return id ? `${ITEMS_KEY}_user_${id}` : ITEMS_KEY;
  }

  private readLocalItems(userId?: number): AppNotification[] {
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

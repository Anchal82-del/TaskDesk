import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { User, UserRole } from '@app/user.model';

const SESSION_KEY = 'tasklist_session_active';
const TOKEN_KEY = 'taskdesk_token';
const USER_KEY = 'taskdesk_current_user';
const ADMIN_MODE_KEY = 'taskdesk_admin_mode';

interface AuthResponse {
  status: string;
  data: {
    token: string;
    user: User;
  };
  error?: {
    code: string;
    message: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly authUrl = `${environment.apiUrl}/auth`;

  readonly currentUser = signal<User | null>(this.readStoredUser());
  readonly adminModeActive = signal<boolean>(this.readStoredAdminMode());

  readonly isSuperAdmin = computed(() => {
    const user = this.currentUser();
    return Boolean(user && user.username === 'u541023');
  });

  readonly isAdmin = computed(() => {
    const user = this.currentUser();
    if (!user) return false;
    return user.role === 'admin' || user.username === 'u541023';
  });

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (this.isLoggedIn()) {
      this.refreshCurrentUser().subscribe();
      this.startPolling();
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        if (this.isLoggedIn()) {
          this.refreshCurrentUser().subscribe();
        }
      });
    }
  }

  setAdminMode(active: boolean): void {
    try {
      sessionStorage.setItem(ADMIN_MODE_KEY, String(active));
    } catch {
      /* storage unavailable */
    }
    this.adminModeActive.set(active);
  }

  private readStoredAdminMode(): boolean {
    try {
      const val = sessionStorage.getItem(ADMIN_MODE_KEY);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  }

  private startPolling(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => {
      if (this.isLoggedIn() && (typeof document === 'undefined' || !document.hidden)) {
        this.refreshCurrentUser().subscribe();
      }
    }, 5000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  refreshCurrentUser(): Observable<User | null> {
    const token = this.getToken();
    if (!token || !this.http) {
      return of(this.currentUser());
    }
    return this.http
      .get<{ status: string; data: User }>(`${this.authUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .pipe(
        map((res) => {
          const user = res.data;
          const normalized: User = {
            ...user,
            role: user.role || (user.username === 'u541023' ? 'admin' : 'user'),
            accessRequested: Boolean(user.accessRequested)
          };
          this.setSession(token, normalized);
          return normalized;
        }),
        catchError(() => of(this.currentUser()))
      );
  }

  // Called with credentials to authenticate against the backend API;
  // or called without arguments for test / mock offline sessions.
  login(username?: string, password?: string): Observable<User> {
    if (username && password && this.http) {
      return this.http
        .post<AuthResponse>(`${this.authUrl}/login`, { username, password })
        .pipe(
          map((res) => {
            const { token, user } = res.data;
            const normalizedUser: User = {
              ...user,
              role: user.role || (user.username === 'u541023' ? 'admin' : 'user'),
              accessRequested: Boolean(user.accessRequested)
            };
            this.setSession(token, normalizedUser);
            this.setAdminMode(true);
            this.startPolling();
            return normalizedUser;
          }),
          catchError((err) => {
            let serverMessage = err.error?.error?.message || err.error?.message;
            if (!serverMessage) {
              if (err.status === 0 || (err.message && String(err.message).toLowerCase().includes('failed to fetch'))) {
                serverMessage =
                  'Unable to connect to the backend server. Please ensure the backend is running on http://localhost:3000.';
              } else {
                serverMessage = err.message || 'Invalid username or password.';
              }
            }
            return throwError(() => new Error(serverMessage));
          })
        );
    }

    // Default test/mock session
    const mockUser: User = {
      id: 1,
      name: 'Anchal',
      username: 'u541023',
      email: 'anchal@taskdesk.dev',
      role: 'admin',
      accessRequested: false
    };
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
      sessionStorage.setItem(USER_KEY, JSON.stringify(mockUser));
      sessionStorage.setItem(ADMIN_MODE_KEY, 'true');
    } catch {
      /* storage unavailable */
    }
    this.adminModeActive.set(true);
    this.currentUser.set(mockUser);
    return of(mockUser);
  }

  logout(): void {
    this.stopPolling();
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(ADMIN_MODE_KEY);
    } catch {
      /* storage unavailable */
    }
    this.adminModeActive.set(true);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    try {
      return sessionStorage.getItem(SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  updateCurrentUserRole(role: UserRole): void {
    const cur = this.currentUser();
    if (!cur) return;
    const updated: User = {
      ...cur,
      role,
      accessRequested: role === 'admin' ? false : cur.accessRequested
    };
    this.setSession(this.getToken() || '', updated);
  }

  updateCurrentUserAccessRequested(requested: boolean): void {
    const cur = this.currentUser();
    if (!cur) return;
    const updated: User = { ...cur, accessRequested: requested };
    this.setSession(this.getToken() || '', updated);
  }

  switchUser(user: User): void {
    const normalizedUser: User = {
      ...user,
      role: user.role || (user.username === 'u541023' ? 'admin' : 'user'),
      accessRequested: Boolean(user.accessRequested)
    };
    this.setSession(this.getToken() || 'demo-token', normalizedUser);
  }

  private setSession(token: string, user: User): void {
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
      }
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* storage unavailable */
    }
    this.currentUser.set(user);
  }

  private readStoredUser(): User | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* storage unavailable */
    }
    return null;
  }
}

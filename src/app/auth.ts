import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { User } from '@app/user.model';

const SESSION_KEY = 'tasklist_session_active';
const TOKEN_KEY = 'taskdesk_token';
const USER_KEY = 'taskdesk_current_user';

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

  // Called with credentials to authenticate against the backend API;
  // or called without arguments for test / mock offline sessions.
  login(username?: string, password?: string): Observable<User> {
    if (username && password && this.http) {
      return this.http
        .post<AuthResponse>(`${this.authUrl}/login`, { username, password })
        .pipe(
          map((res) => {
            const { token, user } = res.data;
            this.setSession(token, user);
            return user;
          }),
          catchError((err) => {
            const serverMessage =
              err.error?.error?.message || err.error?.message || 'Invalid username or password.';
            return throwError(() => new Error(serverMessage));
          })
        );
    }

    // Default test/mock session
    const mockUser: User = {
      id: 1,
      name: 'Anchal',
      username: 'u541023',
      email: 'anchal@taskdesk.dev'
    };
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
      sessionStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    } catch {
      /* storage unavailable */
    }
    this.currentUser.set(mockUser);
    return of(mockUser);
  }

  logout(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable */
    }
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

  private setSession(token: string, user: User): void {
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
      sessionStorage.setItem(TOKEN_KEY, token);
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

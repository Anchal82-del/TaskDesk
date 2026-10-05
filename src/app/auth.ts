import { Injectable } from '@angular/core';

const SESSION_KEY = 'tasklist_session_active';
const TOKEN_KEY = 'taskdesk_token';

// The session flag lives in sessionStorage so a page refresh keeps you signed in.
// It is cleared on logout or when the browser tab is closed.
// This will be replaced by a real token check once the Node API exists.
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  login(): void {
    sessionStorage.setItem(SESSION_KEY, 'true');
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  // Returns the API token once the Node backend issues one; null until then.
  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }
}

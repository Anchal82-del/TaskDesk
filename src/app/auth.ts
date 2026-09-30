// import { Injectable } from '@angular/core';

// // A tiny in-memory "session" — resets on page refresh, same as the task
// // list does right now. This will be replaced by a real token/session
// // check once the Node API exists.
// @Injectable({
//   providedIn: 'root'
// })
// export class AuthService {
//   private loggedIn = false;

//   login(): void {
//     this.loggedIn = true;
//   }

//   logout(): void {
//     this.loggedIn = false;
//   }

//   isLoggedIn(): boolean {
//     return this.loggedIn;
//   }
// }

import { Injectable } from '@angular/core';

const SESSION_KEY = 'tasklist_session_active';

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
  }

  isLoggedIn(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }
}

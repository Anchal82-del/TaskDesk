import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  RouterStateSnapshot
} from '@angular/router';
import { AuthService } from '@app/auth';
import { adminGuard } from '@app/admin-guard';

@Component({ standalone: true, template: '' })
class DummyDashboardComponent {}

describe('adminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'dashboard', component: DummyDashboardComponent }])]
    });
  });

  it('blocks navigation when logged out', () => {
    expect(executeGuard(route, state)).toBe(false);
  });

  it('allows navigation when user is admin', () => {
    const auth = TestBed.inject(AuthService);
    auth.login(); // Logs in as default mockUser Anchal u541023 (admin)
    expect(executeGuard(route, state)).toBe(true);
  });

  it('blocks navigation when user is non-admin', () => {
    const auth = TestBed.inject(AuthService);
    auth.login();
    auth.updateCurrentUserRole('user');
    auth.currentUser.set({
      id: 2,
      name: 'Jyoti Singh',
      username: 'u541024',
      email: 'jyoti@taskdesk.dev',
      role: 'user'
    });
    expect(executeGuard(route, state)).toBe(false);
  });

  it('allows navigation when user is regular admin', () => {
    const auth = TestBed.inject(AuthService);
    auth.login();
    auth.currentUser.set({
      id: 2,
      name: 'Jyoti Singh',
      username: 'u541024',
      email: 'jyoti@taskdesk.dev',
      role: 'admin'
    });
    expect(executeGuard(route, state)).toBe(true);
  });
});

import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  RouterStateSnapshot
} from '@angular/router';
import { AuthService } from '@app/auth';
import { authGuard } from '@app/auth-guard';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('blocks navigation when logged out', () => {
    expect(executeGuard(route, state)).toBe(false);
  });

  it('allows navigation when logged in', () => {
    TestBed.inject(AuthService).login();
    expect(executeGuard(route, state)).toBe(true);
  });
});

import { TestBed } from '@angular/core/testing';
import { AuthService } from '@app/auth';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('starts logged out, then logs in and out', () => {
    expect(service.isLoggedIn()).toBe(false);
    service.login();
    expect(service.isLoggedIn()).toBe(true);
    service.logout();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('has no token until the backend issues one', () => {
    expect(service.getToken()).toBeNull();
  });
});

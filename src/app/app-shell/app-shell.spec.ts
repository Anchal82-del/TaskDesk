import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppShellComponent } from '@app/app-shell/app-shell';
import { AuthService } from '@app/auth';

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([
          { path: 'admin', children: [] },
          { path: 'dashboard', children: [] }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggles between Admin Profile and User Profile for admin users', () => {
    const auth = TestBed.inject(AuthService);
    auth.login();

    // Admin starts in Admin Profile
    expect(component.isAdmin()).toBe(true);
    expect(component.isAdminProfile()).toBe(true);

    // Switch to User Profile
    component.switchToUserProfile();
    expect(component.isAdminProfile()).toBe(false);

    // Switch back to Admin Profile
    component.switchToAdminProfile();
    expect(component.isAdminProfile()).toBe(true);
  });
});

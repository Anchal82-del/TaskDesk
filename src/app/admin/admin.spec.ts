import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminComponent } from '@app/admin/admin';
import { AuthService } from '@app/auth';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initializes with default requests tab', () => {
    expect(component.activeTab()).toBe('requests');
  });

  it('canRevokeAdmin correctly authorizes revoking other admins but protects Super Admin and self', () => {
    const auth = TestBed.inject(AuthService);
    auth.login();

    // Current user in test mock is Super Admin (u541023, id: 1)
    const superAdminUser = { id: 1, name: 'Anchal', username: 'u541023', email: 'anchal@taskdesk.dev', role: 'admin' as const };
    const appointedAdmin = { id: 2, name: 'Jyoti Singh', username: 'u541024', email: 'jyoti@taskdesk.dev', role: 'admin' as const };

    // Super Admin cannot be revoked
    expect(component.canRevokeAdmin(superAdminUser)).toBe(false);

    // Appointed admin Jyoti can be revoked by Super Admin
    expect(component.canRevokeAdmin(appointedAdmin)).toBe(true);
  });
});

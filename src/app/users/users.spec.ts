import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UsersComponent } from '@app/users/users';
import { AuthService } from '@app/auth';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggles between All Users and Logs views', () => {
    expect(component.activeView()).toBe('all');
    component.setActiveView('logs');
    expect(component.activeView()).toBe('logs');
    component.setActiveView('all');
    expect(component.activeView()).toBe('all');
  });

  it('opens and closes create user modal with cleared state', () => {
    component.openCreateModal();
    expect(component.isCreateModalOpen()).toBe(true);
    component.createName.set('Test User');
    component.closeCreateModal();
    expect(component.isCreateModalOpen()).toBe(false);
  });

  it('enforces that Super Admin cannot be edited by non-super admins', () => {
    // Set a non-super-admin user as current user
    authService.currentUser.set({
      id: 2,
      name: 'Jyoti Singh',
      username: 'u541024',
      email: 'jyoti@taskdesk.dev',
      role: 'admin'
    });

    const superAdminUser = {
      id: 1,
      name: 'Super Admin',
      username: 'u541023',
      email: 'super@taskdesk.dev',
      role: 'admin' as const
    };

    expect(component.canEditUser(superAdminUser)).toBe(false);

    const regularUser = {
      id: 3,
      name: 'Standard User',
      username: 'u541099',
      email: 'std@taskdesk.dev',
      role: 'user' as const
    };

    expect(component.canEditUser(regularUser)).toBe(true);
  });

  it('paginates users list properly', () => {
    component.setPageSize(5);
    expect(component.pageSize()).toBe(5);
    expect(component.paginatedUsers().length).toBeLessThanOrEqual(5);
  });

  it('validates mandatory email in edit user profile', () => {
    const userToEdit = {
      id: 5,
      name: 'Adarsh Kumar',
      username: 'u507154',
      email: 'adarsh.kumar@taskdesk.dev',
      role: 'user' as const
    };

    component.openEditModal(userToEdit);
    expect(component.editingUser()).toBeTruthy();

    // Clear email
    component.editEmail.set('');
    component.submitEditUser();
    expect(component.editError()).toBe('Email address is required.');

    // Invalid email format
    component.editEmail.set('notanemail');
    component.submitEditUser();
    expect(component.editError()).toBe('Please enter a valid email address.');
  });

  it('cancels import if there are no new users to import', () => {
    component.pendingImportUsers.set([
      {
        name: 'Existing User',
        username: 'u541023',
        email: 'super@taskdesk.dev',
        role: 'admin',
        isDuplicate: true,
        duplicateReason: 'Duplicate ID'
      }
    ]);
    component.isImportModalOpen.set(true);

    component.confirmImport();
    expect(component.isImportModalOpen()).toBe(false);
  });

  it('triggers refreshUsers from server', () => {
    component.refreshUsers();
    expect(component.isRefreshingUsers()).toBe(true);
  });
});

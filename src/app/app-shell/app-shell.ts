import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@app/auth';
import { UserService } from '@app/user';
import { TaskService } from '@app/task';
import { AccessRequestService } from '@app/access-request.service';
import { ConfirmDialogComponent } from '@app/confirm-dialog/confirm-dialog';
import { NotificationBellComponent } from '@app/shared/notification-bell/notification-bell';
import { ToastService } from '@app/shared/toast/toast.service';
import { ModalScrollLockService } from '@app/core/modal-scroll-lock.service';
import { getAvatarInitials } from '../shared/avatar-initials';

const LOGOUT_DELAY_MS = 400;

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ConfirmDialogComponent,
    NotificationBellComponent
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly taskService = inject(TaskService);
  private readonly accessRequestService = inject(AccessRequestService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly scrollLock = inject(ModalScrollLockService);

  readonly logoutMessage =
    'You will need to sign in again to access your tasks. Any unsaved changes will be lost.';

  readonly currentUser = this.auth.currentUser;
  readonly isSuperAdmin = this.auth.isSuperAdmin;
  readonly isAdmin = this.auth.isAdmin;
  readonly isAdminViewActive = this.taskService.isAdminViewActive;
  readonly myLatestRequest = this.accessRequestService.myLatestRequest;

  readonly roleDisplayName = computed(() => {
    if (this.isSuperAdmin()) return 'Super Admin';
    if (this.isAdmin()) return 'Admin';
    return 'User';
  });

  readonly isPendingRequest = computed(() => {
    const cur = this.currentUser();
    const req = this.myLatestRequest();
    return Boolean(cur?.accessRequested || (req && req.status === 'pending'));
  });

  readonly userInitials = computed(() => getAvatarInitials(this.currentUser()?.name));

  sidebarCollapsed = false;
  isLogoutConfirmOpen = false;
  isLoggingOut = false;
  isSubmittingRequest = signal(false);
  readonly isProfileDropdownOpen = signal(false);
  readonly isProfileModalOpen = signal(false);
  readonly isConfirmRequestOpen = signal(false);
  readonly isConfirmCancelOpen = signal(false);

  readonly isAdminProfile = computed(() => {
    return this.isAdmin() && this.auth.adminModeActive();
  });

  switchToAdminProfile(): void {
    this.closeProfileDropdown();
    if (!this.isAdmin()) return;
    this.auth.setAdminMode(true);
    this.taskService.refreshTasks().subscribe();
    this.router.navigate(['/users']);
  }

  switchToUserProfile(): void {
    this.closeProfileDropdown();
    this.auth.setAdminMode(false);
    this.taskService.refreshTasks().subscribe();
    if (this.router.url.startsWith('/admin') || this.router.url.startsWith('/users')) {
      this.router.navigate(['/dashboard']);
    }
  }

  openAdminConsole(): void {
    this.switchToAdminProfile();
  }

  enableAdminMode(): void {
    this.switchToAdminProfile();
  }

  enableUserMode(): void {
    this.switchToUserProfile();
  }

  switchToAdminView(): void {
    this.switchToAdminProfile();
  }

  switchToMyTasks(): void {
    this.switchToUserProfile();
  }

  get sidebarToggleLabel(): string {
    return this.sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleProfileDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isProfileDropdownOpen.update((open) => !open);
  }

  closeProfileDropdown(): void {
    this.isProfileDropdownOpen.set(false);
  }

  openProfileModal(): void {
    this.closeProfileDropdown();
    this.scrollLock.lock();
    this.isProfileModalOpen.set(true);
    this.accessRequestService.fetchMyRequest().subscribe();
    this.auth.refreshCurrentUser().subscribe();
  }

  closeProfileModal(): void {
    if (this.isProfileModalOpen()) {
      this.scrollLock.unlock();
      this.isProfileModalOpen.set(false);
    }
  }

  openRequestAccessConfirm(): void {
    this.isConfirmRequestOpen.set(true);
  }

  confirmRequestAccess(): void {
    const user = this.currentUser();
    if (!user) return;
    this.isSubmittingRequest.set(true);
    this.accessRequestService.submitRequest().subscribe({
      next: () => {
        this.isSubmittingRequest.set(false);
        this.isConfirmRequestOpen.set(false);
        this.toast.success(
          'Request Submitted',
          'Your admin access request has been submitted for review.'
        );
        this.userService.refreshUsers().subscribe();
        this.accessRequestService.fetchMyRequest().subscribe();
      },
      error: (err: unknown) => {
        this.isSubmittingRequest.set(false);
        this.isConfirmRequestOpen.set(false);
        const msg = err instanceof Error ? err.message : 'Unable to submit request.';
        this.toast.error('Submission Failed', msg);
      }
    });
  }

  openCancelRequestConfirm(): void {
    this.isConfirmCancelOpen.set(true);
  }

  confirmCancelAccess(): void {
    this.accessRequestService.cancelRequest().subscribe({
      next: () => {
        this.isConfirmCancelOpen.set(false);
        this.toast.info('Request Cancelled', 'Your pending admin access request has been cancelled.');
        this.userService.refreshUsers().subscribe();
        this.accessRequestService.fetchMyRequest().subscribe();
      },
      error: () => {
        this.isConfirmCancelOpen.set(false);
        this.toast.error('Error', 'Unable to cancel request. Please try again.');
      }
    });
  }

  openLogoutConfirm(): void {
    this.closeProfileDropdown();
    this.isLogoutConfirmOpen = true;
  }

  cancelLogout(): void {
    this.isLogoutConfirmOpen = false;
  }

  confirmLogout(): void {
    this.isLoggingOut = true;
    setTimeout(() => {
      this.auth.logout();
      this.toast.info('Signed out', 'You have been signed out.');
      this.router.navigate(['/logged-out']);
    }, LOGOUT_DELAY_MS);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isProfileDropdownOpen()) {
      const isAvatarBtn = (event.target as HTMLElement)?.closest('.avatar-btn');
      const isDropdown = (event.target as HTMLElement)?.closest('.profile-dropdown');
      if (!isAvatarBtn && !isDropdown) {
        this.closeProfileDropdown();
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeProfileDropdown();
    this.closeProfileModal();
  }
}

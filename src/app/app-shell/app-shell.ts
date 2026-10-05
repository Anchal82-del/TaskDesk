import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@app/auth';
import { ConfirmDialogComponent } from '@app/confirm-dialog/confirm-dialog';
import { NotificationBellComponent } from '@app/shared/notification-bell/notification-bell';

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
  private readonly router = inject(Router);

  readonly logoutMessage =
    'You will need to sign in again to access your tasks. Any unsaved changes will be lost.';

  sidebarCollapsed = false;
  isLogoutConfirmOpen = false;
  isLoggingOut = false;

  get sidebarToggleLabel(): string {
    return this.sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  openLogoutConfirm(): void {
    this.isLogoutConfirmOpen = true;
  }

  cancelLogout(): void {
    this.isLogoutConfirmOpen = false;
  }

  confirmLogout(): void {
    this.isLoggingOut = true;
    // Short delay so the loading state on the button is visible.
    setTimeout(() => {
      this.auth.logout();
      this.router.navigate(['/logged-out']);
    }, LOGOUT_DELAY_MS);
  }
}

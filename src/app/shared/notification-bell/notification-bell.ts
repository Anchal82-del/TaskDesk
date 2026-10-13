import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '@app/notification';
import { AppNotification } from '@app/notification.model';
import { AuthService } from '@app/auth';

const MAX_BADGE_COUNT = 9;

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'close()'
  }
})
export class NotificationBellComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationService);

  readonly isOpen = signal(false);

  get badgeLabel(): string {
    const count = this.notifications.unreadCount();
    return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
  }

  get tooltip(): string | null {
    return this.isOpen() ? null : 'Notifications';
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.notifications.fetchNotifications().subscribe();
      this.isOpen.set(true);
    }
  }

  close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
  }

  markAllRead(): void {
    this.notifications.markAllRead();
  }

  clearAll(): void {
    this.notifications.clearAll();
  }

  handleItemClick(n: AppNotification): void {
    if (!n.read) {
      this.notifications.markAsRead(n.id);
    }

    if (this.auth.isAdmin() && (n.type === 'access_request' || n.metadata?.requestId)) {
      const requestId = n.entityId || n.metadata?.requestId;
      this.close();
      this.router.navigate(['/admin'], {
        queryParams: { tab: 'requests', requestId }
      });
      return;
    }

    if (
      n.type === 'access_request_approved' ||
      n.type === 'access_request_declined' ||
      n.type === 'admin_access_revoked' ||
      n.type === 'access_request_cancelled'
    ) {
      this.auth.refreshCurrentUser().subscribe();
    }
  }

  onDocumentClick(event: Event): void {
    const target = event.target;
    if (this.isOpen() && target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.close();
    }
  }
}

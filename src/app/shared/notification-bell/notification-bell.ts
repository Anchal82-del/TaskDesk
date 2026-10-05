import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationService } from '@app/notification';

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
      this.isOpen.set(true);
    }
  }

  close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.notifications.markAllRead();
  }

  onDocumentClick(event: Event): void {
    const target = event.target;
    if (this.isOpen() && target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.close();
    }
  }
}

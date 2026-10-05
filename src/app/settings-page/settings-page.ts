import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '@app/notification';
import { SettingsService, Theme } from '@app/settings';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent {
  private readonly settings = inject(SettingsService);
  private readonly notifications = inject(NotificationService);

  readonly theme = this.settings.theme;
  readonly notificationsEnabled = this.notifications.enabled;

  setTheme(theme: Theme): void {
    this.settings.setTheme(theme);
  }

  onNotifToggle(enabled: boolean): void {
    this.notifications.setEnabled(enabled);
  }
}

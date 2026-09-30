import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SettingsService, Theme } from '../settings';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent {
  private readonly settings = inject(SettingsService);
  theme = this.settings.theme;

  setTheme(theme: Theme): void {
    this.settings.setTheme(theme);
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from '@app/settings';
import { ToastContainerComponent } from '@app/shared/toast/toast-container';

@Component({
  imports: [RouterOutlet, ToastContainerComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  // Injected so the saved theme is applied as soon as the app starts.
  private readonly settings = inject(SettingsService);
}

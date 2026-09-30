import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from './settings';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html'
})
export class App {
  private readonly settings = inject(SettingsService);
  protected readonly title = signal('taskdesk');
}

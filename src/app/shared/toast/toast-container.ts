import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { ToastItem } from './toast.model';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  dismiss(toast: ToastItem): void {
    this.toastService.dismiss(toast.id);
  }
}

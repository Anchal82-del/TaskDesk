import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onCancel()' }
})
export class ConfirmDialogComponent {
  @Input() heading = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Yes, continue';
  @Input() cancelLabel = 'Cancel';
  @Input() danger = false;
  @Input() isBusy = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  get confirmText(): string {
    return this.isBusy ? 'Please wait…' : this.confirmLabel;
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    if (this.isBusy) return;
    this.cancelled.emit();
  }
}

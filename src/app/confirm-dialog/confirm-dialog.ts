import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { ModalScrollLockService } from '@app/core/modal-scroll-lock.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onCancel()' }
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {
  private readonly scrollLock = inject(ModalScrollLockService);

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

  ngOnInit(): void {
    this.scrollLock.lock();
  }

  ngOnDestroy(): void {
    this.scrollLock.unlock();
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    if (this.isBusy) return;
    this.cancelled.emit();
  }
}

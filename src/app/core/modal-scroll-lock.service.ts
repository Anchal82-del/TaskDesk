import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalScrollLockService {
  private activeModalCount = 0;

  lock(): void {
    this.activeModalCount++;
    if (this.activeModalCount === 1 && typeof document !== 'undefined') {
      document.body.classList.add('modal-open');
    }
  }

  unlock(): void {
    this.activeModalCount = Math.max(0, this.activeModalCount - 1);
    if (this.activeModalCount === 0 && typeof document !== 'undefined') {
      document.body.classList.remove('modal-open');
    }
  }
}

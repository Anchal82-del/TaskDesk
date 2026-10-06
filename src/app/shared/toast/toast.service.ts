import { Injectable, signal } from '@angular/core';
import { ToastItem, ToastType } from './toast.model';

const DEFAULT_TOAST_DURATION = 4000;

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  show(type: ToastType, title: string, message = '', duration = DEFAULT_TOAST_DURATION): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast: ToastItem = {
      id,
      type,
      title,
      message,
      duration,
      timestamp: Date.now()
    };

    // Keep at most 5 recent toasts to avoid overwhelming the screen
    this.toasts.update((current) => [...current, toast].slice(-5));

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(title: string, message = '', duration = DEFAULT_TOAST_DURATION): void {
    this.show('success', title, message, duration);
  }

  error(title: string, message = '', duration = 5000): void {
    this.show('error', title, message, duration);
  }

  info(title: string, message = '', duration = DEFAULT_TOAST_DURATION): void {
    this.show('info', title, message, duration);
  }

  warning(title: string, message = '', duration = DEFAULT_TOAST_DURATION): void {
    this.show('warning', title, message, duration);
  }

  dismiss(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}

import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    service.clear();
  });

  it('adds success toast', () => {
    service.success('Saved', 'Task saved successfully');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].type).toBe('success');
    expect(service.toasts()[0].title).toBe('Saved');
  });

  it('adds error, warning, and info toasts', () => {
    service.error('Failed', 'Something went wrong');
    service.warning('Warning', 'Be careful');
    service.info('Info', 'Informational message');
    expect(service.toasts().length).toBe(3);
  });

  it('dismisses a toast by id', () => {
    service.success('Saved');
    const toastId = service.toasts()[0].id;
    service.dismiss(toastId);
    expect(service.toasts().length).toBe(0);
  });
});

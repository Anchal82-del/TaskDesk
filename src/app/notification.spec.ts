import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@app/notification';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('adds unread notifications and marks them read', () => {
    service.add('Hello');
    expect(service.unreadCount()).toBe(1);
    service.markAllRead();
    expect(service.unreadCount()).toBe(0);
  });

  it('ignores new notifications while disabled', () => {
    service.setEnabled(false);
    service.add('Hidden');
    expect(service.items().length).toBe(0);
  });
});

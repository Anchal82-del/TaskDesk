import { TestBed } from '@angular/core/testing';
import { SettingsService } from '@app/settings';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
  });

  it('applies and stores the chosen theme', () => {
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('taskdesk_theme')).toBe('dark');
  });
});

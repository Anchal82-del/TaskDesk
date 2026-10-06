import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastContainerComponent } from './toast-container';
import { ToastService } from './toast.service';

describe('ToastContainerComponent', () => {
  let component: ToastContainerComponent;
  let fixture: ComponentFixture<ToastContainerComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ToastContainerComponent);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    toastService.clear();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders active toasts', () => {
    toastService.success('Saved', 'Saved successfully');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Saved');
    expect(element.textContent).toContain('Saved successfully');
  });

  it('dismisses toast when close button clicked', () => {
    toastService.success('To dismiss');
    fixture.detectChanges();
    const closeBtn = fixture.nativeElement.querySelector('.toast-close') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(toastService.toasts().length).toBe(0);
  });
});

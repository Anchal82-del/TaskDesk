import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TaskDetailComponent } from '@app/task-detail/task-detail';

describe('TaskDetailComponent', () => {
  let component: TaskDetailComponent;
  let fixture: ComponentFixture<TaskDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskDetailComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDetailComponent);
    fixture.componentRef.setInput('task', {
      id: 1,
      title: 'Sample task',
      description: '',
      priority: 'low',
      status: 'todo',
      reviewerId: 1,
      assigneeId: 2,
      projectId: 1
    });
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

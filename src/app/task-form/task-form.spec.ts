import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TaskFormComponent } from '@app/task-form/task-form';

describe('TaskFormComponent', () => {
  let component: TaskFormComponent;
  let fixture: ComponentFixture<TaskFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskFormComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should detect when reviewer and assignee are identical', () => {
    component.taskForm.patchValue({
      title: 'Test',
      priority: 'high',
      status: 'todo',
      reviewerId: 2,
      assigneeId: 2,
      projectId: 1
    });
    expect(component.taskForm.errors?.['reviewerIsAssignee']).toBe(true);
    expect(component.taskForm.invalid).toBe(true);
  });

  it('should be valid when reviewer and assignee are different', () => {
    component.taskForm.patchValue({
      title: 'Test',
      priority: 'high',
      status: 'todo',
      reviewerId: 1,
      assigneeId: 2,
      projectId: 1
    });
    expect(component.taskForm.errors?.['reviewerIsAssignee']).toBeFalsy();
    expect(component.taskForm.valid).toBe(true);
  });

  it('excludes the assignee from available reviewers', () => {
    component.taskForm.controls.assigneeId.setValue(2);
    expect(component.availableReviewers.some((u) => u.id === 2)).toBe(false);
  });
});

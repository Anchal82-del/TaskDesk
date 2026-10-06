import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { AuthService } from '@app/auth';
import { ProjectService } from '@app/project';
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '@app/task.constants';
import { Task, TaskInput, TaskPriority, TaskStatus } from '@app/task.model';
import { User } from '@app/user.model';
import { UserService } from '@app/user';

type FieldName = 'title' | 'priority' | 'status' | 'reviewerId' | 'assigneeId' | 'projectId';

function reviewerNotAssigneeValidator(control: AbstractControl): ValidationErrors | null {
  const reviewerId = control.get('reviewerId')?.value;
  const assigneeId = control.get('assigneeId')?.value;
  if (
    reviewerId !== null &&
    assigneeId !== null &&
    reviewerId !== undefined &&
    assigneeId !== undefined &&
    Number(reviewerId) === Number(assigneeId)
  ) {
    return { reviewerIsAssignee: true };
  }
  return null;
}

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onCancel()' }
})
export class TaskFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly projectService = inject(ProjectService);
  private readonly auth = inject(AuthService);

  @Input() task: Task | null = null;
  @Output() save = new EventEmitter<TaskInput>();
  @Output() closed = new EventEmitter<void>();

  readonly users = this.userService.getUsers();
  readonly projects = this.projectService.getProjects();
  readonly priorityOptions = TASK_PRIORITY_OPTIONS;
  readonly statusOptions = TASK_STATUS_OPTIONS;

  // null means "nothing chosen yet" — Validators.required rejects it, so saving
  // without picking a value shows the field error.
  taskForm = this.fb.group(
    {
      title: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/)]),
      description: this.fb.nonNullable.control(''),
      priority: this.fb.control<TaskPriority | null>(null, Validators.required),
      status: this.fb.control<TaskStatus | null>(null, Validators.required),
      reviewerId: this.fb.control<number | null>(null, Validators.required),
      assigneeId: this.fb.control<number | null>(null, Validators.required),
      projectId: this.fb.control<number | null>(null, Validators.required)
    },
    { validators: [reviewerNotAssigneeValidator] }
  );

  get isEditMode(): boolean {
    return this.task !== null;
  }

  get heading(): string {
    return this.task ? `Edit task #${this.task.id}` : 'New task';
  }

  get submitLabel(): string {
    return this.isEditMode ? 'Save' : 'Save task';
  }

  get currentUser(): User | null {
    return this.auth.getCurrentUser();
  }

  // The reviewer dropdown excludes whoever is the assignee (and the creator),
  // ensuring the signed-in user or assignee cannot be selected as reviewer.
  get availableReviewers(): User[] {
    const raw = this.taskForm.getRawValue();
    const currentUserId = this.auth.getCurrentUser()?.id;
    const excludedId = raw.assigneeId ?? currentUserId;
    return this.users.filter((u) => u.id !== excludedId);
  }

  get hasReviewerAssigneeConflict(): boolean {
    return (
      Boolean(this.taskForm.errors?.['reviewerIsAssignee']) &&
      (this.taskForm.controls.reviewerId.touched || this.taskForm.controls.assigneeId.touched)
    );
  }

  isInvalid(name: FieldName): boolean {
    const control = this.taskForm.controls[name];
    return control.invalid && control.touched;
  }

  ngOnInit(): void {
    if (this.task) {
      this.taskForm.patchValue({
        title: this.task.title,
        description: this.task.description,
        priority: this.task.priority,
        status: this.task.status,
        reviewerId: this.task.reviewerId,
        assigneeId: this.task.assigneeId,
        projectId: this.task.projectId
      });
      this.taskForm.controls.assigneeId.disable();
    } else {
      // For a new task: pre-select the signed-in user as assignee and lock it so it cannot be changed.
      const current = this.auth.getCurrentUser();
      if (current) {
        this.taskForm.controls.assigneeId.setValue(current.id);
        this.taskForm.controls.assigneeId.disable();
      }
    }
  }

  onSubmit(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const value = this.taskForm.getRawValue();
    const { priority, status, reviewerId, assigneeId, projectId } = value;
    if (
      priority === null ||
      status === null ||
      reviewerId === null ||
      assigneeId === null ||
      projectId === null
    ) {
      return;
    }

    if (Number(reviewerId) === Number(assigneeId)) {
      this.taskForm.markAllAsTouched();
      return;
    }

    this.save.emit({
      title: value.title.trim(),
      description: value.description.trim(),
      priority,
      status,
      reviewerId,
      assigneeId,
      projectId
    });
  }

  onCancel(): void {
    this.closed.emit();
  }
}

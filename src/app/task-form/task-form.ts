import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @Input() task: Task | null = null;
  @Output() save = new EventEmitter<TaskInput>();
  @Output() closed = new EventEmitter<void>();

  get users(): User[] {
    return this.userService.getUsers();
  }

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
    return this.isEditMode ? 'Update' : 'Save task';
  }

  get currentUser(): User | null {
    return this.auth.getCurrentUser();
  }

  // The reviewer dropdown excludes whoever is selected as assignee,
  // ensuring assignee and reviewer cannot be the same user.
  get availableReviewers(): User[] {
    const raw = this.taskForm.getRawValue();
    const assigneeId = raw.assigneeId;
    if (!assigneeId) {
      return this.users;
    }
    return this.users.filter((u) => u.id !== Number(assigneeId));
  }

  // The assignee dropdown excludes whoever is selected as reviewer,
  // ensuring reviewer and assignee cannot be the same user.
  get availableAssignees(): User[] {
    const raw = this.taskForm.getRawValue();
    const reviewerId = raw.reviewerId;
    if (!reviewerId) {
      return this.users;
    }
    return this.users.filter((u) => u.id !== Number(reviewerId));
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
    this.taskForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.cdr.markForCheck();
      });

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

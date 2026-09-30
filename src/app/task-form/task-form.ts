import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Task } from '../task.model';
import { UserService } from '../user';
import { ProjectService } from '../project';

type FieldName = 'title' | 'priority' | 'status' | 'reporterId' | 'assigneeId' | 'projectId';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onCancel()' }
})
export class TaskFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly projectService = inject(ProjectService);

  @Input() task: Task | null = null;
  @Output() save = new EventEmitter<Omit<Task, 'id'>>();
  @Output() closed = new EventEmitter<void>();

  users = this.userService.getUsers();
  projects = this.projectService.getProjects();

  // '' and null are the "nothing chosen yet" sentinels — Validators.required
  // rejects both, so saving without picking a value shows the field error.
  taskForm = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/)]),
    priority: this.fb.nonNullable.control<'' | Task['priority']>('', Validators.required),
    status: this.fb.nonNullable.control<'' | Task['status']>('', Validators.required),
    reporterId: this.fb.control<number | null>(null, Validators.required),
    assigneeId: this.fb.control<number | null>(null, Validators.required),
    projectId: this.fb.control<number | null>(null, Validators.required)
  });

  get isEditMode(): boolean {
    return this.task !== null;
  }

  isInvalid(name: FieldName): boolean {
    const control = this.taskForm.controls[name];
    return control.invalid && control.touched;
  }

  ngOnInit(): void {
    if (this.task) {
      this.taskForm.patchValue({
        title: this.task.title,
        priority: this.task.priority,
        status: this.task.status,
        reporterId: this.task.reporterId,
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
    this.save.emit({
      title: value.title.trim(),
      // Description now lives only in the Task Details popup. New tasks
      // start with an empty one; editing here never touches it.
      description: this.task?.description ?? '',
      priority: value.priority as Task['priority'],
      status: value.status as Task['status'],
      reporterId: value.reporterId as number,
      assigneeId: value.assigneeId as number,
      projectId: value.projectId as number
    });
  }

  onCancel(): void {
    this.closed.emit();
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { NgClass } from '@angular/common';
import { ProjectService } from '@app/project';
import {
  TASK_PRIORITY_CLASSES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_CLASSES,
  TASK_STATUS_LABELS
} from '@app/task.constants';
import { Task } from '@app/task.model';
import { UserService } from '@app/user';
import { ModalScrollLockService } from '@app/core/modal-scroll-lock.service';

// Read-only view of a task. Changes are made through the Edit form.
@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [NgClass],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onClose()' }
})
export class TaskDetailComponent implements OnInit, OnDestroy {
  private readonly userService = inject(UserService);
  private readonly projectService = inject(ProjectService);
  private readonly scrollLock = inject(ModalScrollLockService);

  @Input({ required: true }) task!: Task;
  @Output() closed = new EventEmitter<void>();

  readonly statusLabel = TASK_STATUS_LABELS;
  readonly priorityLabel = TASK_PRIORITY_LABELS;
  readonly statusClass = TASK_STATUS_CLASSES;
  readonly priorityClass = TASK_PRIORITY_CLASSES;

  get reviewerName(): string {
    return this.userService.getUserById(this.task.reviewerId)?.name ?? 'Unknown';
  }
  get assigneeName(): string {
    return this.userService.getUserById(this.task.assigneeId)?.name ?? 'Unassigned';
  }
  get projectName(): string {
    return this.projectService.getProjectById(this.task.projectId)?.name ?? '—';
  }

  ngOnInit(): void {
    this.scrollLock.lock();
  }

  ngOnDestroy(): void {
    this.scrollLock.unlock();
  }

  onClose(): void {
    this.closed.emit();
  }
}

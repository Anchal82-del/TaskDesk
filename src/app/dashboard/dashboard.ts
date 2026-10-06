import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, merge, timer } from 'rxjs';
import { ConfirmDialogComponent } from '@app/confirm-dialog/confirm-dialog';
import { ProjectService } from '@app/project';
import { PaginationComponent } from '@app/shared/pagination/pagination';
import { TaskService } from '@app/task';
import { ToastService } from '@app/shared/toast/toast.service';
import { AuthService } from '@app/auth';
import {
  TASK_PRIORITY_CLASSES,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_CLASSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS
} from '@app/task.constants';
import { Task, TaskInput } from '@app/task.model';
import { TaskDetailComponent } from '@app/task-detail/task-detail';
import { TaskExportService } from '@app/task-export';
import { TaskFormComponent } from '@app/task-form/task-form';
import { TaskNotifierService } from '@app/task-notifier';
import { UserService } from '@app/user';
import {
  ALL,
  DEFAULT_FILTERS,
  filterTasks,
  paginate,
  SortDirection,
  SortField,
  sortTasks,
  TaskFilters,
  totalPagesFor
} from '@app/utils/task-query';
import { TaskCounts, TaskStatsComponent } from '@app/dashboard/task-stats/task-stats';

interface TaskRow {
  task: Task;
  reviewerName: string;
  assigneeName: string;
}

const SEARCH_DEBOUNCE_MS = 250;
const LOADING_DELAY_MS = 600;
const DEFAULT_PAGE_SIZE = 5;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    TaskFormComponent,
    TaskDetailComponent,
    ConfirmDialogComponent,
    TaskStatsComponent,
    PaginationComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private readonly projectService = inject(ProjectService);
  private readonly taskExport = inject(TaskExportService);
  private readonly notifier = inject(TaskNotifierService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly currentUser = this.auth.currentUser;
  readonly projects = this.projectService.getProjects();
  readonly statusOptions = TASK_STATUS_OPTIONS;
  readonly priorityOptions = TASK_PRIORITY_OPTIONS;
  readonly statusLabel = TASK_STATUS_LABELS;
  readonly priorityLabel = TASK_PRIORITY_LABELS;
  readonly statusClass = TASK_STATUS_CLASSES;
  readonly priorityClass = TASK_PRIORITY_CLASSES;
  readonly pageSizeOptions: readonly number[] = [5, 10, 15, 20];

  // Reactive forms drive the filter and view controls; their values are mirrored into signals.
  readonly filterForm = this.fb.nonNullable.group({
    search: '',
    projectId: ALL,
    status: ALL,
    priority: ALL
  });
  readonly viewForm = this.fb.nonNullable.group({
    pageSize: this.fb.nonNullable.control<number>(DEFAULT_PAGE_SIZE),
    sortBy: this.fb.nonNullable.control<SortField>('id')
  });

  private readonly allTasks = toSignal<Task[], Task[]>(this.taskService.getTasks(), {
    initialValue: []
  });
  private readonly filters = signal<TaskFilters>({ ...DEFAULT_FILTERS });
  private readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  private readonly sortBy = signal<SortField>('id');
  private readonly sortDir = signal<SortDirection>('asc');
  private readonly requestedPage = signal(1);

  readonly isLoading = signal(true);
  readonly isModalOpen = signal(false);
  readonly editingTask = signal<Task | null>(null);
  readonly viewingTask = signal<Task | null>(null);
  readonly taskPendingDelete = signal<Task | null>(null);
  readonly isDeleting = signal(false);

  readonly counts = computed<TaskCounts>(() => {
    const tasks = this.allTasks();
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      progress: tasks.filter((t) => t.status === 'progress').length,
      done: tasks.filter((t) => t.status === 'done').length
    };
  });

  readonly filteredTasks = computed<Task[]>(() =>
    sortTasks(filterTasks(this.allTasks(), this.filters()), this.sortBy(), this.sortDir())
  );
  readonly totalFilteredCount = computed(() => this.filteredTasks().length);
  readonly currentPage = computed(() =>
    Math.min(this.requestedPage(), totalPagesFor(this.totalFilteredCount(), this.pageSize()))
  );
  readonly rangeStart = computed(() =>
    this.totalFilteredCount() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.totalFilteredCount())
  );
  readonly pageSizeValue = computed(() => this.pageSize());

  readonly rows = computed<TaskRow[]>(() =>
    paginate(this.filteredTasks(), this.currentPage(), this.pageSize()).map((task) => ({
      task,
      reviewerName: this.userService.getUserById(task.reviewerId)?.name ?? 'Unknown',
      assigneeName: this.userService.getUserById(task.assigneeId)?.name ?? 'Unassigned'
    }))
  );

  readonly deleteMessage = computed(
    () =>
      `Are you sure you want to delete "${this.taskPendingDelete()?.title ?? ''}"? ` +
      'This action is permanent and cannot be undone.'
  );

  readonly isSortDescending = computed(() => this.sortDir() === 'desc');
  readonly sortDirLabel = computed(() => (this.isSortDescending() ? 'Descending' : 'Ascending'));

  constructor() {
    this.watchFilters();
    this.watchView();
    timer(LOADING_DELAY_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.isLoading.set(false));
  }

  private watchFilters(): void {
    const { search, projectId, status, priority } = this.filterForm.controls;
    search.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.syncFilters());
    merge(projectId.valueChanges, status.valueChanges, priority.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.syncFilters());
  }

  private watchView(): void {
    const { pageSize, sortBy } = this.viewForm.controls;
    pageSize.valueChanges.pipe(takeUntilDestroyed()).subscribe((size) => {
      this.pageSize.set(size);
      this.requestedPage.set(1);
    });
    sortBy.valueChanges.pipe(takeUntilDestroyed()).subscribe((field) => {
      this.sortBy.set(field);
      this.requestedPage.set(1);
    });
  }

  private syncFilters(): void {
    this.filters.set(this.filterForm.getRawValue());
    this.requestedPage.set(1);
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.syncFilters();
  }

  toggleSortDir(): void {
    this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    this.requestedPage.set(1);
  }

  goToPage(page: number): void {
    this.requestedPage.set(page);
  }

  downloadCsv(): void {
    this.taskExport.exportToCsv(this.filteredTasks());
    this.toast.info('Export successful', 'Tasks list has been downloaded as CSV.');
  }

  openAddModal(): void {
    this.editingTask.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(task: Task): void {
    this.editingTask.set(task);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingTask.set(null);
  }

  openDetail(task: Task): void {
    this.viewingTask.set(task);
  }

  closeDetail(): void {
    this.viewingTask.set(null);
  }

  refreshTasks(): void {
    this.isLoading.set(true);
    this.taskService.refreshTasks().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  handleSave(data: TaskInput): void {
    const editing = this.editingTask();
    if (editing) {
      this.taskService.updateTask(editing.id, data).subscribe({
        next: () => {
          this.notifier.notifyUpdated(editing, data);
          this.toast.success(
            'Task updated successfully',
            `Task #${editing.id} "${data.title}" was saved.`
          );
        },
        error: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Could not update task.';
          this.toast.error('Update failed', msg);
        }
      });
    } else {
      this.taskService.addTask(data).subscribe({
        next: (created) => {
          this.notifier.notifyCreated(data);
          this.toast.success(
            'Task saved successfully',
            `Task "${created.title}" was created.`
          );
        },
        error: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Could not save task.';
          this.toast.error('Save failed', msg);
        }
      });
    }
    this.closeModal();
  }

  requestDelete(task: Task): void {
    this.taskPendingDelete.set(task);
  }

  cancelDelete(): void {
    this.taskPendingDelete.set(null);
  }

  confirmDelete(): void {
    const task = this.taskPendingDelete();
    if (!task) return;
    this.isDeleting.set(true);
    this.taskService.deleteTask(task.id).subscribe({
      next: () => {
        this.notifier.notifyDeleted(task);
        this.toast.success(
          'Task deleted successfully',
          `Task #${task.id} "${task.title}" was permanently removed.`
        );
        this.isDeleting.set(false);
        this.taskPendingDelete.set(null);
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Could not delete task.';
        this.toast.error('Delete failed', msg);
        this.isDeleting.set(false);
        this.taskPendingDelete.set(null);
      }
    });
  }
}

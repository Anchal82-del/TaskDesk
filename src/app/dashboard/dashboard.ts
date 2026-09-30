import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../task';
import { Task } from '../task.model';
import { TaskFormComponent } from '../task-form/task-form';
import { TaskDetailComponent } from '../task-detail/task-detail';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog';
import { UserService } from '../user';
import { ProjectService } from '../project';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, NgClass, TaskFormComponent, TaskDetailComponent, ConfirmDialogComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private readonly projectService = inject(ProjectService);
  private readonly cdr = inject(ChangeDetectorRef);

  users = this.userService.getUsers();
  projects = this.projectService.getProjects();

  tasks: Task[] = [];
  isLoading = true;

  searchQuery = '';
  statusFilter = 'all';
  priorityFilter = 'all';
  projectFilter = 'all';

  pageSize = 5;
  currentPage = 1;
  readonly pageSizeOptions = [5, 10, 15, 20];

  isModalOpen = false;
  editingTask: Task | null = null;

  viewingTask: Task | null = null;

  taskPendingDelete: Task | null = null;
  isDeleting = false;

  readonly statusLabel: Record<Task['status'], string> = {
    todo: 'To do',
    progress: 'In progress',
    done: 'Done'
  };
  readonly priorityLabel: Record<Task['priority'], string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  };

  ngOnInit(): void {
    setTimeout(() => {
      this.taskService.getTasks().subscribe((tasks) => {
        this.tasks = tasks;
        this.isLoading = false;
        this.cdr.markForCheck();
      });
    }, 600);
  }

  get filteredTasks(): Task[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.tasks.filter((t) => {
      if (this.statusFilter !== 'all' && t.status !== this.statusFilter) return false;
      if (this.priorityFilter !== 'all' && t.priority !== this.priorityFilter) return false;
      if (this.projectFilter !== 'all' && t.projectId !== Number(this.projectFilter)) return false;
      if (query) {
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesId = t.id.toString().includes(query);
        if (!matchesTitle && !matchesId) return false;
      }
      return true;
    });
  }

  get totalFilteredCount(): number {
    return this.filteredTasks.length;
  }
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalFilteredCount / this.pageSize));
  }
  get pagedTasks(): Task[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTasks.slice(start, start + this.pageSize);
  }
  get rangeStart(): number {
    return this.totalFilteredCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }
  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalFilteredCount);
  }
  get visiblePageNumbers(): (number | 'ellipsis')[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    if (current > 3) pages.push('ellipsis');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let p = start; p <= end; p++) pages.push(p);
    if (current < total - 2) pages.push('ellipsis');
    pages.push(total);
    return pages;
  }

  get totalCount(): number {
    return this.tasks.length;
  }
  get todoCount(): number {
    return this.tasks.filter((t) => t.status === 'todo').length;
  }
  get progressCount(): number {
    return this.tasks.filter((t) => t.status === 'progress').length;
  }
  get doneCount(): number {
    return this.tasks.filter((t) => t.status === 'done').length;
  }

  getReporterName(id: number): string {
    return this.userService.getUserById(id)?.name ?? 'Unknown';
  }
  getAssigneeName(id: number): string {
    return this.userService.getUserById(id)?.name ?? 'Unassigned';
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }
  clearFilters(): void {
    this.statusFilter = 'all';
    this.priorityFilter = 'all';
    this.projectFilter = 'all';
    this.searchQuery = '';
    this.currentPage = 1;
  }

  downloadCsv(): void {
    const header = ['ID', 'Title', 'Priority', 'Status', 'Reporter', 'Assignee', 'Project'];
    const rows = this.filteredTasks.map((t) => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      this.priorityLabel[t.priority],
      this.statusLabel[t.status],
      this.getReporterName(t.reporterId),
      this.getAssigneeName(t.assigneeId),
      this.projectService.getProjectById(t.projectId)?.name ?? ''
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tasks.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  openAddModal(): void {
    this.editingTask = null;
    this.isModalOpen = true;
  }
  openEditModal(task: Task): void {
    this.editingTask = task;
    this.isModalOpen = true;
  }
  closeModal(): void {
    this.isModalOpen = false;
    this.editingTask = null;
  }

  openDetail(task: Task): void {
    this.viewingTask = task;
  }
  closeDetail(): void {
    this.viewingTask = null;
  }
  handleDetailSave(newDescription: string): void {
    if (!this.viewingTask) return;
    const { id, ...rest } = this.viewingTask;
    this.taskService.updateTask(id, { ...rest, description: newDescription });
    this.viewingTask = { ...this.viewingTask, description: newDescription };
  }

  handleSave(data: Omit<Task, 'id'>): void {
    if (this.editingTask) {
      this.taskService.updateTask(this.editingTask.id, data);
    } else {
      this.taskService.addTask(data);
    }
    this.closeModal();
  }

  requestDelete(task: Task): void {
    this.taskPendingDelete = task;
  }
  cancelDelete(): void {
    this.taskPendingDelete = null;
  }
  confirmDelete(): void {
    if (!this.taskPendingDelete) return;
    this.isDeleting = true;
    const id = this.taskPendingDelete.id;
    setTimeout(() => {
      this.taskService.deleteTask(id);
      this.isDeleting = false;
      this.taskPendingDelete = null;
    }, 400);
  }

  get deleteConfirmMessage(): string {
    const title = this.taskPendingDelete?.title ?? '';
    return `This action cannot be undone and changes will be permanent. Are you sure you want to delete "${title}"?`;
  }
}

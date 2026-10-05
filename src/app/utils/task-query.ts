import { Task, TaskPriority, TaskStatus } from '@app/task.model';

export type SortField = 'id' | 'priority' | 'status';
export type SortDirection = 'asc' | 'desc';
export type PageItem = number | 'ellipsis';

export interface TaskFilters {
  search: string;
  projectId: string;
  status: string;
  priority: string;
}

export const ALL = 'all';

export const DEFAULT_FILTERS: Readonly<TaskFilters> = {
  search: '',
  projectId: ALL,
  status: ALL,
  priority: ALL
};

const PRIORITY_RANK: Readonly<Record<TaskPriority, number>> = { high: 0, medium: 1, low: 2 };
const STATUS_RANK: Readonly<Record<TaskStatus, number>> = { todo: 0, progress: 1, done: 2 };

export function filterTasks(tasks: readonly Task[], filters: TaskFilters): Task[] {
  const query = filters.search.trim().toLowerCase();
  return tasks.filter((t) => {
    if (filters.status !== ALL && t.status !== filters.status) return false;
    if (filters.priority !== ALL && t.priority !== filters.priority) return false;
    if (filters.projectId !== ALL && t.projectId !== Number(filters.projectId)) return false;
    if (!query) return true;
    return t.title.toLowerCase().includes(query) || t.id.toString().includes(query);
  });
}

function primaryDiff(a: Task, b: Task, field: SortField): number {
  if (field === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (field === 'status') return STATUS_RANK[a.status] - STATUS_RANK[b.status];
  return a.id - b.id;
}

// Ties (same priority/status) always fall back to ascending ID so the order is stable.
export function sortTasks(
  tasks: readonly Task[],
  field: SortField,
  direction: SortDirection
): Task[] {
  const sign = direction === 'desc' ? -1 : 1;
  return [...tasks].sort((a, b) => sign * primaryDiff(a, b, field) || a.id - b.id);
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPagesFor(itemCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

export function visiblePages(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: PageItem[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

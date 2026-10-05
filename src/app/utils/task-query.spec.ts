import { Task } from '@app/task.model';
import {
  ALL,
  DEFAULT_FILTERS,
  filterTasks,
  paginate,
  sortTasks,
  TaskFilters,
  totalPagesFor,
  visiblePages
} from '@app/utils/task-query';

const make = (id: number, overrides: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  description: '',
  priority: 'medium',
  status: 'todo',
  reviewerId: 1,
  assigneeId: 1,
  projectId: 1,
  ...overrides
});

describe('task-query', () => {
  const tasks = [
    make(1, { priority: 'low' }),
    make(2, { priority: 'high', status: 'done', projectId: 2 }),
    make(3, { title: 'Fix login', priority: 'high' })
  ];

  it('filters by search text, status, priority and project', () => {
    const ids = (overrides: Partial<TaskFilters>): number[] =>
      filterTasks(tasks, { ...DEFAULT_FILTERS, ...overrides }).map((t) => t.id);
    expect(ids({ search: 'login' })).toEqual([3]);
    expect(ids({ status: 'done' })).toEqual([2]);
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, priority: 'high' }).length).toBe(2);
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, projectId: '2' }).length).toBe(1);
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, search: '1', status: ALL }).length).toBe(1);
  });

  it('sorts by priority and falls back to ascending id on ties', () => {
    expect(sortTasks(tasks, 'priority', 'asc').map((t) => t.id)).toEqual([2, 3, 1]);
    expect(sortTasks(tasks, 'priority', 'desc').map((t) => t.id)).toEqual([1, 2, 3]);
    expect(sortTasks(tasks, 'id', 'desc').map((t) => t.id)).toEqual([3, 2, 1]);
  });

  it('paginates and counts pages', () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(totalPagesFor(0, 5)).toBe(1);
    expect(totalPagesFor(11, 5)).toBe(3);
  });

  it('builds a compact page list with ellipses', () => {
    expect(visiblePages(1, 3)).toEqual([1, 2, 3]);
    expect(visiblePages(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
  });
});

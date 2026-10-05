import { TaskPriority, TaskStatus } from '@app/task.model';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  todo: 'To do',
  progress: 'In progress',
  done: 'Done'
};

export const TASK_PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

export const TASK_STATUS_CLASSES: Readonly<Record<TaskStatus, string>> = {
  todo: 'badge--todo',
  progress: 'badge--progress',
  done: 'badge--done'
};

export const TASK_PRIORITY_CLASSES: Readonly<Record<TaskPriority, string>> = {
  high: 'priority-tag--high',
  medium: 'priority-tag--medium',
  low: 'priority-tag--low'
};

export const TASK_STATUS_OPTIONS: readonly SelectOption<TaskStatus>[] = [
  { value: 'todo', label: TASK_STATUS_LABELS.todo },
  { value: 'progress', label: TASK_STATUS_LABELS.progress },
  { value: 'done', label: TASK_STATUS_LABELS.done }
];

export const TASK_PRIORITY_OPTIONS: readonly SelectOption<TaskPriority>[] = [
  { value: 'high', label: TASK_PRIORITY_LABELS.high },
  { value: 'medium', label: TASK_PRIORITY_LABELS.medium },
  { value: 'low', label: TASK_PRIORITY_LABELS.low }
];

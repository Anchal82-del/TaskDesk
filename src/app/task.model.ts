export type TaskStatus = 'todo' | 'progress' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  reviewerId: number;
  assigneeId: number;
  projectId: number;
}

// Everything a user supplies when creating or editing a task (the id is system-generated).
export type TaskInput = Omit<Task, 'id'>;

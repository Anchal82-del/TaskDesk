export interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'progress' | 'done';
  reporterId: number;
  assigneeId: number;
  projectId: number;
}

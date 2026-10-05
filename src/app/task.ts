import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Task, TaskInput } from '@app/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasks: Task[] = [
    {
      id: 1,
      title: 'Design homepage banner',
      description: 'New banner for the spring campaign.',
      priority: 'medium',
      status: 'todo',
      reviewerId: 2,
      assigneeId: 1,
      projectId: 1
    },
    {
      id: 2,
      title: 'Fix login validation bug',
      description: 'Password field accepts empty spaces.',
      priority: 'high',
      status: 'progress',
      reviewerId: 3,
      assigneeId: 2,
      projectId: 3
    },
    {
      id: 3,
      title: 'Prepare release notes',
      description: 'Summarize changes for v1.2.',
      priority: 'low',
      status: 'todo',
      reviewerId: 1,
      assigneeId: 3,
      projectId: 2
    },
    {
      id: 4,
      title: 'Review pull request #482',
      description: 'Check the new filtering logic.',
      priority: 'high',
      status: 'progress',
      reviewerId: 4,
      assigneeId: 4,
      projectId: 3
    },
    {
      id: 5,
      title: 'Update user documentation',
      description: 'Add screenshots for the new dashboard.',
      priority: 'low',
      status: 'done',
      reviewerId: 2,
      assigneeId: 1,
      projectId: 2
    },
    {
      id: 6,
      title: 'Plan sprint retrospective',
      description: 'Book a room and prep discussion topics.',
      priority: 'medium',
      status: 'done',
      reviewerId: 1,
      assigneeId: 2,
      projectId: 1
    },
    {
      id: 7,
      title: 'Set up CI pipeline',
      description: 'Automated build and test on every push.',
      priority: 'high',
      status: 'todo',
      reviewerId: 4,
      assigneeId: 3,
      projectId: 3
    },
    {
      id: 8,
      title: 'Audit accessibility issues',
      description: 'Run an automated and manual accessibility pass.',
      priority: 'medium',
      status: 'todo',
      reviewerId: 3,
      assigneeId: 4,
      projectId: 1
    }
  ];

  private nextId = this.tasks.length + 1;
  private tasksSubject = new BehaviorSubject<Task[]>(this.tasks);

  getTasks(): Observable<Task[]> {
    return this.tasksSubject.asObservable();
  }

  addTask(data: TaskInput): void {
    const newTask: Task = { id: this.nextId++, ...data };
    this.tasks = [...this.tasks, newTask];
    this.tasksSubject.next(this.tasks);
  }

  updateTask(id: number, data: TaskInput): void {
    this.tasks = this.tasks.map((t) => (t.id === id ? { id, ...data } : t));
    this.tasksSubject.next(this.tasks);
  }

  deleteTask(id: number): void {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.tasksSubject.next(this.tasks);
  }
}

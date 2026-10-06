import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '@env/environment';
import { Task, TaskInput } from '@app/task.model';
import { AuthService } from '@app/auth';

export interface ApiResponse<T> {
  status: string;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/tasks`;

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
      reviewerId: 1,
      assigneeId: 4,
      projectId: 3
    },
    {
      id: 5,
      title: 'Update user documentation',
      description: 'Add screenshots for the new dashboard.',
      priority: 'low',
      status: 'done',
      reviewerId: 4,
      assigneeId: 1,
      projectId: 2
    },
    {
      id: 6,
      title: 'Plan sprint retrospective',
      description: 'Book a room and prep discussion topics.',
      priority: 'medium',
      status: 'done',
      reviewerId: 3,
      assigneeId: 4,
      projectId: 1
    },
    {
      id: 7,
      title: 'Set up CI pipeline',
      description: 'Automated build and test on every push.',
      priority: 'high',
      status: 'todo',
      reviewerId: 2,
      assigneeId: 3,
      projectId: 3
    },
    {
      id: 8,
      title: 'Audit accessibility issues',
      description: 'Run an automated and manual accessibility pass.',
      priority: 'medium',
      status: 'todo',
      reviewerId: 4,
      assigneeId: 2,
      projectId: 1
    }
  ];

  private nextId = this.tasks.length + 1;
  private tasksSubject = new BehaviorSubject<Task[]>(this.tasks);
  private hasLoadedFromApi = false;

  constructor() {
    if (this.http) {
      this.refreshTasks().subscribe();
    }
  }

  getTasks(): Observable<Task[]> {
    if (this.http && !this.hasLoadedFromApi) {
      this.refreshTasks().subscribe();
    }
    return this.tasksSubject.asObservable().pipe(
      map((all) => this.filterForCurrentUser(all))
    );
  }

  refreshTasks(): Observable<Task[]> {
    if (!this.http) {
      return of(this.filterForCurrentUser(this.tasks));
    }
    return this.http.get<ApiResponse<Task[]>>(this.baseUrl).pipe(
      map((res) => res.data),
      tap((remoteTasks) => {
        if (Array.isArray(remoteTasks)) {
          this.tasks = remoteTasks;
          this.nextId = remoteTasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
          this.tasksSubject.next(this.tasks);
          this.hasLoadedFromApi = true;
        }
      }),
      map((tasks) => this.filterForCurrentUser(tasks)),
      catchError((error) => {
        console.warn('Could not fetch tasks from backend API. Using local state.', error);
        return of(this.filterForCurrentUser(this.tasksSubject.value));
      }),
      shareReplay(1)
    );
  }

  getTaskById(id: number): Observable<Task | null> {
    if (!this.http) {
      const found = this.tasks.find((t) => t.id === id) || null;
      return of(found);
    }
    return this.http.get<ApiResponse<Task>>(`${this.baseUrl}/${id}`).pipe(
      map((res) => res.data),
      catchError(() => {
        const found = this.tasks.find((t) => t.id === id) || null;
        return of(found);
      })
    );
  }

  addTask(data: TaskInput): Observable<Task> {
    const localTask: Task = { id: this.nextId++, ...data };
    this.tasks = [...this.tasks, localTask];
    this.tasksSubject.next(this.tasks);

    if (!this.http) {
      return of(localTask);
    }

    const req$ = this.http.post<ApiResponse<Task>>(this.baseUrl, data).pipe(
      map((res) => res.data),
      tap((created) => {
        this.tasks = this.tasks.map((t) => (t.id === localTask.id ? created : t));
        this.nextId = Math.max(this.nextId, created.id + 1);
        this.tasksSubject.next(this.tasks);
      }),
      catchError((err) => {
        console.warn('API addTask failed, keeping optimistic local task', err);
        return of(localTask);
      }),
      shareReplay(1)
    );

    req$.subscribe({ error: (err) => console.debug('Task API error:', err) });
    return req$;
  }

  updateTask(id: number, data: TaskInput): Observable<Task> {
    const updated: Task = { id, ...data };
    this.tasks = this.tasks.map((t) => (t.id === id ? updated : t));
    this.tasksSubject.next(this.tasks);

    if (!this.http) {
      return of(updated);
    }

    const req$ = this.http.put<ApiResponse<Task>>(`${this.baseUrl}/${id}`, data).pipe(
      map((res) => res.data),
      tap((remoteUpdated) => {
        this.tasks = this.tasks.map((t) => (t.id === id ? remoteUpdated : t));
        this.tasksSubject.next(this.tasks);
      }),
      catchError((err) => {
        console.warn('API updateTask failed, keeping optimistic local update', err);
        return of(updated);
      }),
      shareReplay(1)
    );

    req$.subscribe({ error: (err) => console.debug('Task API error:', err) });
    return req$;
  }

  deleteTask(id: number): Observable<void> {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.tasksSubject.next(this.tasks);

    if (!this.http) {
      return of(undefined);
    }

    const req$ = this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError((err) => {
        console.warn('API deleteTask failed, keeping optimistic local deletion', err);
        return of(undefined);
      }),
      shareReplay(1)
    );

    req$.subscribe({ error: (err) => console.debug('Task API error:', err) });
    return req$;
  }

  private filterForCurrentUser(taskList: Task[]): Task[] {
    const user = this.auth.getCurrentUser();
    if (!user) return taskList;
    return taskList.filter((t) => t.reviewerId === user.id || t.assigneeId === user.id);
  }
}

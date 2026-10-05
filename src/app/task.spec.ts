import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TaskService } from '@app/task';
import { TaskInput } from '@app/task.model';

const NEW_TASK: TaskInput = {
  title: 'Write tests',
  description: '',
  priority: 'low',
  status: 'todo',
  reviewerId: 1,
  assigneeId: 2,
  projectId: 1
};

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskService);
  });

  it('adds a task with the next id', async () => {
    const before = (await firstValueFrom(service.getTasks())).length;
    service.addTask(NEW_TASK);
    const tasks = await firstValueFrom(service.getTasks());
    expect(tasks.length).toBe(before + 1);
    expect(tasks[tasks.length - 1].id).toBe(before + 1);
  });

  it('updates and deletes a task', async () => {
    service.updateTask(1, { ...NEW_TASK, title: 'Renamed' });
    expect((await firstValueFrom(service.getTasks())).find((t) => t.id === 1)?.title).toBe(
      'Renamed'
    );
    service.deleteTask(1);
    expect((await firstValueFrom(service.getTasks())).some((t) => t.id === 1)).toBe(false);
  });
});

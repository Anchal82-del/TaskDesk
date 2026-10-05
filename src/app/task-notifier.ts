import { inject, Injectable } from '@angular/core';
import { NotificationService } from '@app/notification';
import { TASK_STATUS_LABELS } from '@app/task.constants';
import { Task, TaskInput } from '@app/task.model';
import { UserService } from '@app/user';

// Turns task changes into human-readable in-app notifications.
@Injectable({
  providedIn: 'root'
})
export class TaskNotifierService {
  private readonly notifications = inject(NotificationService);
  private readonly userService = inject(UserService);

  notifyCreated(data: TaskInput): void {
    this.notifications.add(`New task "${data.title}" assigned to ${this.assignee(data)}.`);
  }

  notifyUpdated(previous: Task, data: TaskInput): void {
    const label = `Task #${previous.id} "${data.title}"`;
    if (previous.assigneeId !== data.assigneeId) {
      this.notifications.add(`${label} was reassigned to ${this.assignee(data)}.`);
    }
    if (previous.status !== data.status) {
      this.notifications.add(`${label} moved to ${TASK_STATUS_LABELS[data.status]}.`);
    }
    const otherChanges = this.changedFields(previous, data);
    if (otherChanges.length > 0) {
      this.notifications.add(`${label} was updated (${otherChanges.join(', ')}).`);
    }
  }

  notifyDeleted(task: Task): void {
    this.notifications.add(`Task #${task.id} "${task.title}" was deleted.`);
  }

  // Fields other than assignee/status, which have their own messages above.
  private changedFields(previous: Task, data: TaskInput): string[] {
    const checks: [string, boolean][] = [
      ['title', previous.title !== data.title],
      ['description', previous.description !== data.description],
      ['priority', previous.priority !== data.priority],
      ['reviewer', previous.reviewerId !== data.reviewerId],
      ['project', previous.projectId !== data.projectId]
    ];
    return checks.filter(([, changed]) => changed).map(([name]) => name);
  }

  private assignee(data: TaskInput): string {
    return this.userService.getUserById(data.assigneeId)?.name ?? 'Unassigned';
  }
}

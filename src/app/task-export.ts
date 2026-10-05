import { inject, Injectable } from '@angular/core';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@app/task.constants';
import { Task } from '@app/task.model';
import { ProjectService } from '@app/project';
import { UserService } from '@app/user';
import { buildCsv, downloadCsv } from '@app/utils/csv-export';

const HEADER = [
  'ID',
  'Title',
  'Description',
  'Priority',
  'Status',
  'Reviewer',
  'Assignee',
  'Project'
] as const;

@Injectable({
  providedIn: 'root'
})
export class TaskExportService {
  private readonly userService = inject(UserService);
  private readonly projectService = inject(ProjectService);

  exportToCsv(tasks: readonly Task[], fileName = 'tasks.csv'): void {
    const rows = tasks.map((t) => [
      t.id,
      t.title,
      t.description,
      TASK_PRIORITY_LABELS[t.priority],
      TASK_STATUS_LABELS[t.status],
      this.userService.getUserById(t.reviewerId)?.name ?? 'Unknown',
      this.userService.getUserById(t.assigneeId)?.name ?? 'Unassigned',
      this.projectService.getProjectById(t.projectId)?.name ?? ''
    ]);
    downloadCsv(fileName, buildCsv(HEADER, rows));
  }
}

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface TaskCounts {
  total: number;
  todo: number;
  progress: number;
  done: number;
}

@Component({
  selector: 'app-task-stats',
  standalone: true,
  templateUrl: './task-stats.html',
  styleUrl: './task-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskStatsComponent {
  @Input({ required: true }) counts!: TaskCounts;
}

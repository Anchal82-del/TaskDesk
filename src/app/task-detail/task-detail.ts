import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Task } from '../task.model';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onClose()' }
})
export class TaskDetailComponent implements OnChanges {
  @Input({ required: true }) task!: Task;
  @Output() save = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  isEditingDescription = false;
  draftDescription = '';

  // Runs whenever a different task is passed in — resets the edit state
  // so switching tasks doesn't leave a stale draft on screen.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task']) {
      this.draftDescription = this.task.description;
      this.isEditingDescription = false;
    }
  }

  startEdit(): void {
    this.draftDescription = this.task.description;
    this.isEditingDescription = true;
  }

  cancelEdit(): void {
    this.draftDescription = this.task.description;
    this.isEditingDescription = false;
  }

  saveDescription(): void {
    this.save.emit(this.draftDescription.trim());
    this.isEditingDescription = false;
  }

  onClose(): void {
    this.closed.emit();
  }
}

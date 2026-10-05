import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { PageItem, totalPagesFor, visiblePages } from '@app/utils/task-query';

@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationComponent {
  @Input({ required: true }) currentPage = 1;
  @Input({ required: true }) totalItems = 0;
  @Input({ required: true }) pageSize = 5;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return totalPagesFor(this.totalItems, this.pageSize);
  }

  get pages(): PageItem[] {
    return visiblePages(this.currentPage, this.totalPages);
  }

  get isFirstPage(): boolean {
    return this.currentPage === 1;
  }

  get isLastPage(): boolean {
    return this.currentPage === this.totalPages;
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.pageChange.emit(page);
  }
}

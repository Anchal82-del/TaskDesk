import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  computed,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '@app/user.model';
import { getAvatarInitials } from '../avatar-initials';

@Component({
  selector: 'app-user-search-select',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-search-select.html',
  styleUrl: './user-search-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserSearchSelectComponent {
  @Input({ required: true }) label = '';
  @Input() required = false;
  @Input() placeholder = 'Search by name, email, or ID...';
  @Input() disabled = false;
  @Input() hasError = false;
  @Input() errorMessage = '';
  @Input() idPrefix = 'user-select';

  readonly selectedUserIdSignal = signal<number | null>(null);
  @Input('selectedUserId') set setSelectedUserId(val: number | null | undefined) {
    this.selectedUserIdSignal.set(val !== null && val !== undefined ? Number(val) : null);
  }

  readonly usersSignal = signal<User[]>([]);
  @Input('users') set setUsers(val: User[] | null | undefined) {
    this.usersSignal.set(val || []);
  }

  @Output() userSelected = new EventEmitter<number | null>();
  @Output() blurred = new EventEmitter<void>();

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('containerRef') containerRef?: ElementRef<HTMLElement>;

  readonly searchQuery = signal('');
  readonly isInputFocused = signal(false);

  readonly selectedUser = computed<User | null>(() => {
    const id = this.selectedUserIdSignal();
    if (id === null || id === undefined) {
      return null;
    }
    const list = this.usersSignal();
    return list.find((u) => Number(u.id) === Number(id)) || null;
  });

  // The dropdown only appears when the user actually types something into the search input!
  readonly hasSearchQuery = computed(() => {
    return this.searchQuery().trim().length > 0;
  });

  readonly isDropdownOpen = computed(() => {
    return !this.selectedUser() && this.hasSearchQuery() && this.isInputFocused();
  });

  readonly filteredUsers = computed<User[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return [];
    }
    return this.usersSignal().filter((u) => {
      const matchName = u.name?.toLowerCase().includes(query);
      const matchEmail = u.email?.toLowerCase().includes(query);
      const matchId = u.username?.toLowerCase().includes(query);
      return Boolean(matchName || matchEmail || matchId);
    });
  });

  getInitials(name?: string): string {
    return getAvatarInitials(name);
  }

  isSuperAdmin(user?: User | null): boolean {
    return Boolean(user && user.username === 'u541023');
  }

  isAdmin(user?: User | null): boolean {
    return Boolean(user && (user.role === 'admin' || user.username === 'u541023'));
  }

  onInputFocus(): void {
    if (this.disabled) return;
    this.isInputFocused.set(true);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.isInputFocused.set(true);
  }

  selectUser(user: User): void {
    this.selectedUserIdSignal.set(user.id);
    this.userSelected.emit(user.id);
    this.searchQuery.set('');
    this.isInputFocused.set(false);
  }

  clearSelection(event: Event): void {
    event.stopPropagation();
    this.selectedUserIdSignal.set(null);
    this.userSelected.emit(null);
    this.searchQuery.set('');
    this.isInputFocused.set(true);
    setTimeout(() => {
      this.searchInputRef?.nativeElement?.focus();
    }, 50);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.containerRef) {
      const clickedInside = this.containerRef.nativeElement.contains(event.target as Node);
      if (!clickedInside) {
        if (this.isInputFocused()) {
          this.isInputFocused.set(false);
          this.blurred.emit();
        }
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isInputFocused.set(false);
  }
}

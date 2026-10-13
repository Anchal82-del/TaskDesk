import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { User, UserRole } from '@app/user.model';
import { UserService } from '@app/user';
import { AuthService } from '@app/auth';
import { ToastService } from '@app/shared/toast/toast.service';
import { ConfirmDialogComponent } from '@app/confirm-dialog/confirm-dialog';
import { getAvatarInitials } from '../shared/avatar-initials';
import * as XLSX from 'xlsx';

interface UserRow extends User {
  initial: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, ConfirmDialogComponent],
  templateUrl: './users.html',
  styleUrl: './users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  readonly getInitials = getAvatarInitials;
  readonly currentUser = this.auth.currentUser;

  private readonly rawUsers = toSignal<User[], User[]>(this.userService.users$, {
    initialValue: this.userService.getUsers()
  });

  readonly searchQuery = signal('');
  readonly selectedTab = signal<'all' | 'admin' | 'user'>('all');
  readonly viewingUser = signal<User | null>(null);
  readonly userPendingDelete = signal<User | null>(null);
  readonly isDeletingUser = signal(false);
  readonly isImporting = signal(false);
  readonly pendingImportUsers = signal<Array<{ name: string; username: string; email: string; role: UserRole }>>([]);
  readonly pendingImportFileName = signal('');
  readonly isImportModalOpen = signal(false);

  readonly users = computed<UserRow[]>(() => {
    const list = this.rawUsers();
    const query = this.searchQuery().trim().toLowerCase();
    const tab = this.selectedTab();

    return list
      .filter((u) => {
        // Tab filter
        const isUserAdmin = u.role === 'admin' || u.username === 'u541023';
        if (tab === 'admin' && !isUserAdmin) return false;
        if (tab === 'user' && isUserAdmin) return false;

        // Search query filter (matches name, email, employee ID)
        if (query) {
          const matchName = u.name?.toLowerCase().includes(query);
          const matchEmail = u.email?.toLowerCase().includes(query);
          const matchId = u.username?.toLowerCase().includes(query);
          if (!matchName && !matchEmail && !matchId) return false;
        }

        return true;
      })
      .map((user) => ({
        ...user,
        initial: getAvatarInitials(user.name)
      }));
  });

  readonly counts = computed(() => {
    const all = this.rawUsers();
    return {
      all: all.length,
      admins: all.filter((u) => u.role === 'admin' || u.username === 'u541023').length,
      users: all.filter((u) => u.role !== 'admin' && u.username !== 'u541023').length
    };
  });

  setTab(tab: 'all' | 'admin' | 'user'): void {
    this.selectedTab.set(tab);
  }

  isSuperAdmin(user: User | null | undefined): boolean {
    return Boolean(user && user.username === 'u541023');
  }

  isAdminUser(user: User | null | undefined): boolean {
    return Boolean(user && (user.role === 'admin' || user.username === 'u541023'));
  }

  canDeleteUser(user: User | null | undefined): boolean {
    if (!user) return false;
    if (user.username === 'u541023') return false; // Super Admin cannot be deleted
    if (user.id === this.currentUser()?.id) return false; // Cannot delete oneself
    return true;
  }

  openViewModal(u: User): void {
    this.viewingUser.set(u);
  }

  closeViewModal(): void {
    this.viewingUser.set(null);
  }

  openDeleteConfirm(u: User): void {
    if (!this.canDeleteUser(u)) return;
    this.userPendingDelete.set(u);
  }

  cancelDelete(): void {
    this.userPendingDelete.set(null);
  }

  confirmDeleteUser(): void {
    const target = this.userPendingDelete();
    if (!target) return;

    this.isDeletingUser.set(true);
    this.userService.deleteUser(target.id).subscribe({
      next: () => {
        this.isDeletingUser.set(false);
        this.userPendingDelete.set(null);
        this.toast.success('User removed', `${target.name} has been removed from the directory.`);
      },
      error: () => {
        this.isDeletingUser.set(false);
        this.userPendingDelete.set(null);
        this.toast.error('Error', `Failed to remove user ${target.name}.`);
      }
    });
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isImporting.set(true);

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          this.toast.error('Import Failed', 'The uploaded file does not contain any sheets.');
          this.isImporting.set(false);
          input.value = '';
          return;
        }

        const sheet = workbook.Sheets[firstSheetName];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows || rows.length === 0) {
          this.toast.warning('Empty File', 'No data rows found in the uploaded file.');
          this.isImporting.set(false);
          input.value = '';
          return;
        }

        const parsedUsers: Array<{ name: string; username: string; email: string; role: UserRole }> = [];

        for (const row of rows) {
          let name = '';
          let username = '';
          let email = '';
          let role: UserRole = 'user';

          for (const key of Object.keys(row)) {
            const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            const val = String(row[key] ?? '').trim();

            if (['name', 'fullname', 'employeename', 'membername', 'displayname'].includes(normalizedKey)) {
              name = val;
            } else if (
              ['username', 'employeeid', 'empid', 'id', 'wnsid', 'empno', 'userid'].includes(normalizedKey)
            ) {
              username = val;
            } else if (['email', 'emailaddress', 'useremail', 'mail'].includes(normalizedKey)) {
              email = val;
            } else if (['role', 'userrole', 'designation', 'type'].includes(normalizedKey)) {
              if (val.toLowerCase().includes('admin')) {
                role = 'admin';
              }
            }
          }

          // Fallbacks for missing values
          if (!username && email && email.includes('@')) {
            const prefix = email.split('@')[0];
            username = prefix.startsWith('u') ? prefix : `u${Math.floor(100000 + Math.random() * 900000)}`;
          } else if (!username) {
            username = `u${Math.floor(100000 + Math.random() * 900000)}`;
          }

          if (!name && username) {
            name = username;
          }
          if (!name && email) {
            name = email.split('@')[0];
          }

          if (!email && username) {
            email = `${username}@taskdesk.dev`;
          }

          if (name && username) {
            parsedUsers.push({
              name,
              username: username.toLowerCase(),
              email: email.toLowerCase(),
              role
            });
          }
        }

        if (parsedUsers.length === 0) {
          this.toast.error(
            'Import Failed',
            'Could not extract any valid users. Please ensure columns include Name, Employee ID, and Email.'
          );
          this.isImporting.set(false);
          input.value = '';
          return;
        }

        // Show confirmation modal with extracted user details
        this.pendingImportUsers.set(parsedUsers);
        this.pendingImportFileName.set(file.name);
        this.isImportModalOpen.set(true);
        this.isImporting.set(false);
      } catch {
        this.isImporting.set(false);
        input.value = '';
        this.toast.error('File Error', 'Could not parse the selected file. Please verify CSV or Excel format.');
      }
    };

    reader.readAsArrayBuffer(file);
  }

  cancelImport(): void {
    this.isImportModalOpen.set(false);
    this.pendingImportUsers.set([]);
    this.pendingImportFileName.set('');
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  confirmImport(): void {
    const toImport = this.pendingImportUsers();
    if (toImport.length === 0) return;

    this.isImporting.set(true);
    this.userService.bulkAddUsers(toImport).subscribe({
      next: ({ createdCount, skippedCount }) => {
        this.isImporting.set(false);
        this.cancelImport();
        if (createdCount > 0) {
          const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicate(s) skipped)` : '';
          this.toast.success(
            'Users Imported',
            `Successfully added ${createdCount} user${createdCount > 1 ? 's' : ''}${skippedMsg}.`
          );
        } else {
          this.toast.info(
            'No New Users',
            `All ${skippedCount} user(s) from the file already exist in the directory.`
          );
        }
      },
      error: (err: unknown) => {
        this.isImporting.set(false);
        const msg = err instanceof Error ? err.message : 'Could not import users.';
        this.toast.error('Import Failed', msg);
      }
    });
  }

  downloadTemplate(): void {
    const csvContent =
      'Name,Employee ID,Email,Role\n' +
      'Tarun Jaiswal,u506763,tarun.jaiswal@taskdesk.dev,user\n' +
      'Adarsh Kumar,u507154,adarsh.kumar@taskdesk.dev,user\n' +
      'Jyoti Singh,u454880,jyoti.singh@taskdesk.dev,admin\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'taskdesk_users_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toast.info('Template Downloaded', 'Sample CSV template downloaded.');
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { User, UserRole } from '@app/user.model';
import { UserUploadLog } from '@app/user-upload-log.model';
import { UserService } from '@app/user';
import { AuthService } from '@app/auth';
import { ToastService } from '@app/shared/toast/toast.service';
import { ConfirmDialogComponent } from '@app/confirm-dialog/confirm-dialog';
import { PaginationComponent } from '@app/shared/pagination/pagination';
import { getAvatarInitials } from '../shared/avatar-initials';
import { buildCsv, downloadCsv } from '@app/utils/csv-export';
import * as XLSX from 'xlsx';

interface UserRow extends User {
  initial: string;
}

export interface PendingImportItem {
  name: string;
  username: string;
  email: string;
  role: UserRole;
  isDuplicate: boolean;
  duplicateReason?: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, ConfirmDialogComponent, DatePipe, PaginationComponent],
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
  readonly isSuperAdminLoggedIn = this.auth.isSuperAdmin;

  // Active view: 'all' (All Users directory) or 'logs' (Logs / History)
  readonly activeView = signal<'all' | 'logs'>('all');

  private readonly rawUsers = toSignal<User[], User[]>(this.userService.users$, {
    initialValue: this.userService.getUsers()
  });

  // Directory filter state
  readonly searchQuery = signal('');
  readonly selectedTab = signal<'all' | 'admin' | 'user'>('all');
  readonly viewingUser = signal<User | null>(null);
  readonly userPendingDelete = signal<User | null>(null);
  readonly isDeletingUser = signal(false);

  // Pagination for Users table
  readonly pageSizeOptions: readonly number[] = [5, 10, 15, 20];
  readonly pageSize = signal<number>(10);
  readonly requestedPage = signal<number>(1);

  // Pagination for Logs table
  readonly logsPageSize = signal<number>(10);
  readonly requestedLogsPage = signal<number>(1);

  // Create User modal state
  readonly isCreateModalOpen = signal(false);
  readonly isCreatingUser = signal(false);
  readonly createName = signal('');
  readonly createUsername = signal('');
  readonly createEmail = signal('');
  readonly createRole = signal<UserRole>('user');
  readonly createError = signal('');

  // Edit User modal state
  readonly editingUser = signal<User | null>(null);
  readonly isSavingEdit = signal(false);
  readonly editName = signal('');
  readonly editEmail = signal('');
  readonly editRole = signal<UserRole>('user');
  readonly editError = signal('');

  // Import flow state
  readonly isImporting = signal(false);
  readonly pendingImportUsers = signal<PendingImportItem[]>([]);
  readonly pendingImportFileName = signal('');
  readonly isImportModalOpen = signal(false);

  // Upload Logs state
  readonly uploadLogs = signal<UserUploadLog[]>([]);
  readonly isLoadingLogs = signal(false);
  readonly logSearchQuery = signal('');
  readonly selectedLogForModal = signal<UserUploadLog | null>(null);
  readonly recordFilterTab = signal<'all' | 'added' | 'duplicate'>('all');
  readonly recordSearchQuery = signal('');

  constructor() {
    this.loadUploadLogs();
  }

  // Filtered list of users
  readonly filteredUsers = computed<UserRow[]>(() => {
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

  readonly totalFilteredCount = computed(() => this.filteredUsers().length);

  readonly currentPage = computed(() => {
    const total = this.totalFilteredCount();
    const size = this.pageSize();
    const totalPages = Math.max(1, Math.ceil(total / size));
    return Math.min(Math.max(1, this.requestedPage()), totalPages);
  });

  readonly rangeStart = computed(() => {
    if (this.totalFilteredCount() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.totalFilteredCount())
  );

  readonly paginatedUsers = computed<UserRow[]>(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  readonly counts = computed(() => {
    const all = this.rawUsers();
    return {
      all: all.length,
      admins: all.filter((u) => u.role === 'admin' || u.username === 'u541023').length,
      users: all.filter((u) => u.role !== 'admin' && u.username !== 'u541023').length
    };
  });

  // Filtered list of logs
  readonly filteredLogs = computed(() => {
    const list = this.uploadLogs();
    const query = this.logSearchQuery().trim().toLowerCase();
    if (!query) return list;

    return list.filter((l) =>
      l.fileName?.toLowerCase().includes(query) ||
      l.uploadedBy?.name?.toLowerCase().includes(query) ||
      l.uploadedBy?.username?.toLowerCase().includes(query)
    );
  });

  readonly totalFilteredLogsCount = computed(() => this.filteredLogs().length);

  readonly currentLogsPage = computed(() => {
    const total = this.totalFilteredLogsCount();
    const size = this.logsPageSize();
    const totalPages = Math.max(1, Math.ceil(total / size));
    return Math.min(Math.max(1, this.requestedLogsPage()), totalPages);
  });

  readonly logsRangeStart = computed(() => {
    if (this.totalFilteredLogsCount() === 0) return 0;
    return (this.currentLogsPage() - 1) * this.logsPageSize() + 1;
  });

  readonly logsRangeEnd = computed(() =>
    Math.min(this.currentLogsPage() * this.logsPageSize(), this.totalFilteredLogsCount())
  );

  readonly paginatedLogs = computed(() => {
    const start = (this.currentLogsPage() - 1) * this.logsPageSize();
    return this.filteredLogs().slice(start, start + this.logsPageSize());
  });

  readonly logStats = computed(() => {
    const list = this.uploadLogs();
    return {
      totalRuns: list.length,
      totalAdded: list.reduce((sum, l) => sum + (l.addedCount || 0), 0),
      totalDuplicates: list.reduce((sum, l) => sum + (l.duplicateCount || 0), 0)
    };
  });

  readonly pendingNewCount = computed(
    () => this.pendingImportUsers().filter((u) => !u.isDuplicate).length
  );

  readonly pendingDuplicateCount = computed(
    () => this.pendingImportUsers().filter((u) => u.isDuplicate).length
  );

  readonly modalFilteredRecords = computed(() => {
    const log = this.selectedLogForModal();
    if (!log) return [];
    const tab = this.recordFilterTab();
    const query = this.recordSearchQuery().trim().toLowerCase();

    return (log.records || []).filter((r) => {
      if (tab === 'added' && r.status !== 'added') return false;
      if (tab === 'duplicate' && r.status === 'added') return false;

      if (query) {
        const matchName = r.name?.toLowerCase().includes(query);
        const matchUser = r.username?.toLowerCase().includes(query);
        const matchEmail = r.email?.toLowerCase().includes(query);
        const matchReason = r.reason?.toLowerCase().includes(query);
        if (!matchName && !matchUser && !matchEmail && !matchReason) return false;
      }
      return true;
    });
  });

  setActiveView(view: 'all' | 'logs'): void {
    this.activeView.set(view);
    if (view === 'logs') {
      this.loadUploadLogs();
    }
  }

  setTab(tab: 'all' | 'admin' | 'user'): void {
    this.selectedTab.set(tab);
    this.requestedPage.set(1);
  }

  goToPage(page: number): void {
    this.requestedPage.set(page);
  }

  setPageSize(size: number): void {
    this.pageSize.set(Number(size));
    this.requestedPage.set(1);
  }

  goToLogsPage(page: number): void {
    this.requestedLogsPage.set(page);
  }

  setLogsPageSize(size: number): void {
    this.logsPageSize.set(Number(size));
    this.requestedLogsPage.set(1);
  }

  isSuperAdmin(user: User | null | undefined): boolean {
    return Boolean(user && user.username === 'u541023');
  }

  isAdminUser(user: User | null | undefined): boolean {
    return Boolean(user && (user.role === 'admin' || user.username === 'u541023'));
  }

  canEditUser(user: User | null | undefined): boolean {
    if (!user) return false;
    // Super Admin can only be edited by Super Admin
    if (user.username === 'u541023' && !this.isSuperAdminLoggedIn()) {
      return false;
    }
    return true;
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

  /* ---------- Create User Modal ---------- */
  openCreateModal(): void {
    this.createName.set('');
    this.createUsername.set('');
    this.createEmail.set('');
    this.createRole.set('user');
    this.createError.set('');
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.createError.set('');
  }

  submitCreateUser(): void {
    const name = this.createName().trim();
    const username = this.createUsername().trim().toLowerCase();
    const email = this.createEmail().trim().toLowerCase();
    const role = this.createRole();

    if (!name || !username) {
      this.createError.set('Name and Employee ID are required.');
      return;
    }

    if (!email || !email.includes('@')) {
      this.createError.set('A valid email address is required.');
      return;
    }

    const currentList = this.rawUsers();
    if (currentList.some((u) => u.username.toLowerCase() === username)) {
      this.createError.set(`A user with Employee ID "${username}" already exists.`);
      return;
    }

    if (currentList.some((u) => u.email.toLowerCase() === email)) {
      this.createError.set(`A user with email "${email}" already exists.`);
      return;
    }

    this.isCreatingUser.set(true);
    this.createError.set('');

    this.userService
      .createUser({
        name,
        username,
        email,
        role
      })
      .subscribe({
        next: (created) => {
          this.isCreatingUser.set(false);
          this.closeCreateModal();
          this.toast.success('User Created', `${created.name} (${created.username}) has been added to TaskDesk.`);
        },
        error: (err: unknown) => {
          this.isCreatingUser.set(false);
          const msg = err instanceof Error ? err.message : 'Could not create user.';
          this.createError.set(msg);
        }
      });
  }

  /* ---------- Edit User Modal ---------- */
  openEditModal(u: User): void {
    if (!this.canEditUser(u)) {
      this.toast.error('Permission Denied', 'The Super Admin account cannot be edited by administrators.');
      return;
    }
    this.editingUser.set(u);
    this.editName.set(u.name);
    this.editEmail.set(u.email || '');
    this.editRole.set(u.role === 'admin' ? 'admin' : 'user');
    this.editError.set('');
  }

  closeEditModal(): void {
    this.editingUser.set(null);
    this.editError.set('');
  }

  submitEditUser(): void {
    const target = this.editingUser();
    if (!target) return;

    const name = this.editName().trim();
    const email = this.editEmail().trim().toLowerCase();
    const role = this.editRole();

    if (!name) {
      this.editError.set('Full name is required.');
      return;
    }

    if (!email) {
      this.editError.set('Email address is required.');
      return;
    }

    if (!email.includes('@')) {
      this.editError.set('Please enter a valid email address.');
      return;
    }

    // Check duplicate email with another user
    const currentList = this.rawUsers();
    if (currentList.some((u) => u.id !== target.id && u.email.toLowerCase() === email)) {
      this.editError.set(`Another user with email "${email}" already exists.`);
      return;
    }

    this.isSavingEdit.set(true);
    this.editError.set('');

    this.userService
      .updateUser(target.id, {
        name,
        email,
        role
      })
      .subscribe({
        next: () => {
          this.isSavingEdit.set(false);
          this.closeEditModal();
          this.toast.success('User Updated', `Profile details for ${name} have been updated.`);
        },
        error: (err: unknown) => {
          this.isSavingEdit.set(false);
          const msg = err instanceof Error ? err.message : 'Could not update user.';
          this.editError.set(msg);
        }
      });
  }

  /* ---------- Delete User Flow ---------- */
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

  /* ---------- Upload / Import Flow with Duplicate Detection ---------- */
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

        const existingList = this.rawUsers();
        const seenUsernamesInFile = new Set<string>();
        const seenEmailsInFile = new Set<string>();
        const pendingItems: PendingImportItem[] = [];

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
            const lowerUsername = username.toLowerCase();
            const lowerEmail = email.toLowerCase();
            let isDuplicate = false;
            let duplicateReason = '';

            // 1. Check directory collision
            if (existingList.some((u) => u.username.toLowerCase() === lowerUsername)) {
              isDuplicate = true;
              duplicateReason = `Employee ID ${username} already exists in directory`;
            } else if (existingList.some((u) => u.email.toLowerCase() === lowerEmail)) {
              isDuplicate = true;
              duplicateReason = `Email ${email} already exists in directory`;
            } else if (seenUsernamesInFile.has(lowerUsername)) {
              // 2. Check collision within same file
              isDuplicate = true;
              duplicateReason = `Duplicate Employee ID within uploaded file`;
            } else if (seenEmailsInFile.has(lowerEmail)) {
              isDuplicate = true;
              duplicateReason = `Duplicate Email address within uploaded file`;
            }

            seenUsernamesInFile.add(lowerUsername);
            seenEmailsInFile.add(lowerEmail);

            pendingItems.push({
              name,
              username: lowerUsername,
              email: lowerEmail,
              role,
              isDuplicate,
              duplicateReason
            });
          }
        }

        if (pendingItems.length === 0) {
          this.toast.error(
            'Import Failed',
            'Could not extract any valid users. Please ensure columns include Name, Employee ID, and Email.'
          );
          this.isImporting.set(false);
          input.value = '';
          return;
        }

        // Show confirmation modal with duplicate indicators
        this.pendingImportUsers.set(pendingItems);
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
    const items = this.pendingImportUsers();
    if (items.length === 0) return;

    const newItems = items.filter((item) => !item.isDuplicate);
    if (newItems.length === 0) {
      this.toast.info('No New Users', 'All records in this file already exist in the directory.');
      this.cancelImport();
      return;
    }

    const toImport = items.map((item) => ({
      name: item.name,
      username: item.username,
      email: item.email,
      role: item.role
    }));

    const fileName = this.pendingImportFileName() || 'bulk_users_import.xlsx';

    this.isImporting.set(true);
    this.userService.bulkAddUsers(toImport, fileName).subscribe({
      next: ({ createdCount, skippedCount }) => {
        this.isImporting.set(false);
        this.cancelImport();
        this.loadUploadLogs();
        if (createdCount > 0) {
          const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicate(s) skipped)` : '';
          this.toast.success(
            'Users Imported',
            `Successfully added ${createdCount} user${createdCount > 1 ? 's' : ''}${skippedMsg}. Audit log recorded in Logs.`
          );
        } else {
          this.toast.info(
            'No New Users',
            `All ${skippedCount} user(s) were identified as duplicates and skipped. Recorded in Logs.`
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

  readonly isRefreshingUsers = signal(false);

  refreshUsers(): void {
    this.isRefreshingUsers.set(true);
    this.userService.refreshUsers().subscribe({
      next: () => {
        this.isRefreshingUsers.set(false);
        this.toast.success('Refreshed', 'User directory updated from server.');
      },
      error: () => {
        this.isRefreshingUsers.set(false);
        this.toast.info('Refreshed', 'User directory reloaded.');
      }
    });
  }

  /* ---------- Upload Logs Helpers ---------- */
  loadUploadLogs(): void {
    this.isLoadingLogs.set(true);
    this.userService.getUploadLogs().subscribe({
      next: (logs) => {
        this.uploadLogs.set(logs);
        this.isLoadingLogs.set(false);
        this.toast.success('Refreshed', 'Upload logs updated.');
      },
      error: () => {
        this.isLoadingLogs.set(false);
      }
    });
  }

  openLogDetails(log: UserUploadLog): void {
    this.selectedLogForModal.set(log);
    this.recordFilterTab.set('all');
    this.recordSearchQuery.set('');
  }

  closeLogDetails(): void {
    this.selectedLogForModal.set(null);
    this.recordFilterTab.set('all');
    this.recordSearchQuery.set('');
  }

  downloadLogCsv(log: UserUploadLog): void {
    this.userService.exportAuditLogCsv(log);
    this.toast.info('Export Started', `Downloading audit report for ${log.fileName}`);
  }

  downloadUsersCsv(): void {
    const users = this.filteredUsers();
    const header = ['Employee ID', 'Full Name', 'Email Address', 'Role'];
    const rows = users.map((u) => [
      u.username,
      u.name,
      u.email,
      u.role === 'admin' ? (this.isSuperAdmin(u) ? 'Super Admin' : 'Admin') : 'User'
    ]);
    const csv = buildCsv(header, rows);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsv(`taskdesk_users_${dateStr}.csv`, csv);
    this.toast.success('Downloaded', `Exported ${users.length} user record(s) to CSV.`);
  }
}

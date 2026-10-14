import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { User, UserRole } from '@app/user.model';
import { UserUploadLog, UserUploadLogRecord } from '@app/user-upload-log.model';
import { AuthService } from '@app/auth';
import { NotificationService } from '@app/notification';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  private readonly initialUsers: User[] = [
    {
      id: 1,
      name: 'Anchal',
      username: 'u541023',
      email: 'anchal@taskdesk.dev',
      role: 'admin',
      accessRequested: false
    },
    {
      id: 2,
      name: 'Jyoti Singh',
      username: 'u541024',
      email: 'jyoti.singh@taskdesk.dev',
      role: 'admin',
      accessRequested: false
    },
    {
      id: 3,
      name: 'Vivek Kumar',
      username: 'u541025',
      email: 'vivek.kumar@taskdesk.dev',
      role: 'user',
      accessRequested: false
    },
    {
      id: 4,
      name: 'Nikitha Amaresh',
      username: 'u541026',
      email: 'nikitha.amaresh@taskdesk.dev',
      role: 'user',
      accessRequested: false
    }
  ];

  private readonly initialLogs: UserUploadLog[] = [
    {
      id: 1,
      uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      uploadedBy: {
        id: 1,
        name: 'Tarun Jaiswal',
        username: 'u541023'
      },
      fileName: 'TaskDesk_Team_Directory_Batch_1.xlsx',
      fileCount: 1,
      totalRecords: 5,
      addedCount: 4,
      duplicateCount: 1,
      status: 'partial',
      records: [
        {
          name: 'Vivek Sharma',
          username: 'u541024',
          email: 'vivek.sharma@taskdesk.dev',
          role: 'user',
          status: 'added',
          reason: 'Successfully imported'
        },
        {
          name: 'Jyoti Singh',
          username: 'u454880',
          email: 'jyoti.singh@taskdesk.dev',
          role: 'admin',
          status: 'added',
          reason: 'Successfully imported'
        },
        {
          name: 'Adarsh Kumar',
          username: 'u507154',
          email: 'adarsh.kumar@taskdesk.dev',
          role: 'user',
          status: 'added',
          reason: 'Successfully imported'
        },
        {
          name: 'Sara Khan',
          username: 'u541099',
          email: 'sara.khan@taskdesk.dev',
          role: 'user',
          status: 'added',
          reason: 'Successfully imported'
        },
        {
          name: 'Tarun Jaiswal',
          username: 'u541023',
          email: 'tarun.jaiswal@taskdesk.dev',
          role: 'admin',
          status: 'duplicate',
          reason: 'User with ID u541023 already exists'
        }
      ]
    }
  ];

  private readonly uploadLogsSubject = new BehaviorSubject<UserUploadLog[]>(this.initialLogs);
  readonly uploadLogs$ = this.uploadLogsSubject.asObservable();

  private readonly usersSubject = new BehaviorSubject<User[]>(this.loadStoredUsers());
  readonly users$ = this.usersSubject.asObservable();

  constructor() {
    this.refreshUsers().subscribe();
  }

  getUsers(): User[] {
    return this.usersSubject.value;
  }

  getUserById(id: number): User | undefined {
    return this.usersSubject.value.find((u) => u.id === id);
  }

  refreshUsers(): Observable<User[]> {
    if (!this.http) {
      return of(this.usersSubject.value);
    }

    return this.http
      .get<{ status: string; data: User[] }>(this.baseUrl)
      .pipe(
        map((res) => res.data),
        tap((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const excludedUsernames = ['u541027', 'u541028'];
            const filtered = data
              .filter((u) => !excludedUsernames.includes(String(u.username || '').toLowerCase()))
              .map((u) => {
                const canon = this.initialUsers.find(
                  (c) => c.id === u.id || c.username === u.username
                );
                return {
                  ...(canon || u),
                  role: u.role || (canon ? canon.role : (u.username === 'u541023' ? 'admin' : 'user')),
                  accessRequested: Boolean(u.accessRequested)
                };
              });
            this.setUsers(filtered);
          }
        }),
        catchError(() => of(this.usersSubject.value))
      );
  }

  grantAdminAccess(userId: number): Observable<User> {
    return this.updateRole(userId, 'admin');
  }

  revokeAdminAccess(userId: number): Observable<User> {
    return this.updateRole(userId, 'user');
  }

  requestAdminAccess(userId: number): Observable<User> {
    const currentList = this.usersSubject.value;
    const target = currentList.find((u) => u.id === userId);
    if (!target) {
      return of({ id: userId, name: '', username: '', email: '' });
    }

    if (!this.http) {
      const updatedUser: User = { ...target, accessRequested: true };
      this.setUsers(currentList.map((u) => (u.id === userId ? updatedUser : u)));
      const currentUser = this.auth.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        this.auth.updateCurrentUserAccessRequested(true);
      }
      this.notificationService.addForUser(
        1,
        `${target.name} (${target.username}) requested Admin access.`
      );
      return of(updatedUser);
    }

    const headers = this.getAuthHeaders();
    return this.http
      .post<{ status: string; data: unknown }>(
        `${environment.apiUrl}/access-requests`,
        {
          userId: target.id,
          employeeId: target.username,
          requesterName: target.name,
          requesterEmail: target.email
        },
        { headers }
      )
      .pipe(
        map(() => {
          const updatedUser: User = { ...target, accessRequested: true };
          this.setUsers(
            this.usersSubject.value.map((u) => (u.id === userId ? updatedUser : u))
          );
          const currentUser = this.auth.getCurrentUser();
          if (currentUser && currentUser.id === userId) {
            this.auth.updateCurrentUserAccessRequested(true);
          }
          this.notificationService.addForUser(
            1,
            `${target.name} (${target.username}) requested Admin access.`
          );
          return updatedUser;
        }),
        tap(() => this.refreshUsers().subscribe()),
        catchError(() => of({ ...target, accessRequested: true }))
      );
  }

  cancelAdminAccessRequest(userId: number): Observable<User> {
    const currentList = this.usersSubject.value;
    const target = currentList.find((u) => u.id === userId);
    if (!target) {
      return of({ id: userId, name: '', username: '', email: '' });
    }

    if (!this.http) {
      const updatedUser: User = { ...target, accessRequested: false };
      this.setUsers(currentList.map((u) => (u.id === userId ? updatedUser : u)));
      const currentUser = this.auth.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        this.auth.updateCurrentUserAccessRequested(false);
      }
      return of(updatedUser);
    }

    const headers = this.getAuthHeaders();
    return this.http
      .delete<{ status: string; data: unknown }>(
        `${environment.apiUrl}/access-requests/my`,
        { headers }
      )
      .pipe(
        map(() => {
          const updatedUser: User = { ...target, accessRequested: false };
          this.setUsers(
            this.usersSubject.value.map((u) => (u.id === userId ? updatedUser : u))
          );
          const currentUser = this.auth.getCurrentUser();
          if (currentUser && currentUser.id === userId) {
            this.auth.updateCurrentUserAccessRequested(false);
          }
          return updatedUser;
        }),
        tap(() => this.refreshUsers().subscribe()),
        catchError(() => of({ ...target, accessRequested: false }))
      );
  }

  private updateRole(userId: number, role: UserRole): Observable<User> {
    const currentList = this.usersSubject.value;
    const target = currentList.find((u) => u.id === userId);
    if (!target) {
      return of({ id: userId, name: '', username: '', email: '' });
    }

    // Never revoke Super Admin
    if (target.username === 'u541023' && role !== 'admin') {
      return of(target);
    }

    const updatedUser: User = {
      ...target,
      role,
      accessRequested: role === 'admin' ? false : target.accessRequested
    };

    this.setUsers(currentList.map((u) => (u.id === userId ? updatedUser : u)));

    const currentUser = this.auth.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      this.auth.updateCurrentUserRole(role);
    }

    if (!this.http) {
      return of(updatedUser);
    }

    const headers = this.getAuthHeaders();
    return this.http
      .patch<{ status: string; data: User }>(
        `${this.baseUrl}/${userId}/role`,
        { role },
        { headers }
      )
      .pipe(
        map((res) => res.data),
        tap((remote) => {
          this.setUsers(
            this.usersSubject.value.map((u) => (u.id === userId ? remote : u))
          );
          this.refreshUsers().subscribe();
        }),
        catchError(() => of(updatedUser))
      );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  createUser(user: {
    name: string;
    username: string;
    email: string;
    role?: UserRole;
    password?: string;
  }): Observable<User> {
    const currentList = this.usersSubject.value;
    const nextId = Math.max(0, ...currentList.map((u) => u.id || 0)) + 1;
    const newUser: User = {
      id: nextId,
      name: user.name.trim(),
      username: user.username.trim(),
      email: user.email.trim(),
      role: user.role || 'user',
      accessRequested: false
    };

    if (!this.http) {
      this.setUsers([...currentList, newUser]);
      return of(newUser);
    }

    const headers = this.getAuthHeaders();
    return this.http
      .post<{ status: string; data: User }>(
        this.baseUrl,
        {
          name: newUser.name,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          password: user.password || 'Password@123'
        },
        { headers }
      )
      .pipe(
        map((res) => res.data),
        tap((created) => {
          this.setUsers([...this.usersSubject.value.filter((u) => u.id !== created.id), created]);
          this.refreshUsers().subscribe();
        }),
        catchError(() => {
          this.setUsers([...currentList, newUser]);
          return of(newUser);
        })
      );
  }

  updateUser(
    userId: number,
    updates: { name: string; email?: string; role?: UserRole }
  ): Observable<User> {
    const currentList = this.usersSubject.value;
    const target = currentList.find((u) => u.id === userId);
    if (!target) {
      return of({ id: userId, name: updates.name, username: '', email: updates.email || '' });
    }

    const updatedUser: User = {
      ...target,
      name: updates.name.trim(),
      email: updates.email ? updates.email.trim() : target.email,
      role: updates.role || target.role
    };

    this.setUsers(currentList.map((u) => (u.id === userId ? updatedUser : u)));

    if (!this.http) {
      return of(updatedUser);
    }

    const headers = this.getAuthHeaders();
    return this.http
      .put<{ status: string; data: User }>(
        `${this.baseUrl}/${userId}`,
        {
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role
        },
        { headers }
      )
      .pipe(
        map((res) => res.data),
        tap((remote) => {
          this.setUsers(
            this.usersSubject.value.map((u) => (u.id === userId ? remote : u))
          );
          this.refreshUsers().subscribe();
        }),
        catchError(() => of(updatedUser))
      );
  }

  deleteUser(userId: number): Observable<boolean> {
    const currentList = this.usersSubject.value;
    const target = currentList.find((u) => u.id === userId);
    if (!target || target.username === 'u541023') {
      return of(false);
    }

    const updated = currentList.filter((u) => u.id !== userId);
    this.usersSubject.next(updated);
    try {
      localStorage.setItem('taskdesk_users', JSON.stringify(updated));
    } catch {
      /* storage unavailable */
    }

    if (!this.http) {
      return of(true);
    }

    const headers = this.getAuthHeaders();
    return this.http
      .delete<{ status: string; data: unknown }>(`${this.baseUrl}/${userId}`, { headers })
      .pipe(
        map(() => true),
        tap(() => this.refreshUsers().subscribe()),
        catchError(() => of(true))
      );
  }

  getUploadLogs(): Observable<UserUploadLog[]> {
    if (!this.http) {
      return of(this.uploadLogsSubject.value);
    }

    const headers = this.getAuthHeaders();
    return this.http
      .get<{ status: string; data: UserUploadLog[] }>(`${this.baseUrl}/upload-logs`, { headers })
      .pipe(
        map((res) => res.data || []),
        tap((logs) => this.uploadLogsSubject.next(logs)),
        catchError(() => of(this.uploadLogsSubject.value))
      );
  }

  exportAuditLogCsv(log: UserUploadLog): void {
    const headers = ['Employee ID', 'Full Name', 'Email', 'Assigned Role', 'Status', 'Notes'];
    const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

    const rows = (log.records || []).map((r) => [
      escapeCsv(r.username),
      escapeCsv(r.name),
      escapeCsv(r.email),
      escapeCsv(r.role),
      escapeCsv(r.status === 'added' ? 'Added' : 'Duplicate / Skipped'),
      escapeCsv(r.reason || '')
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedBase = log.fileName ? log.fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') : 'users';
    link.setAttribute('download', `import_audit_${sanitizedBase}_${log.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  bulkAddUsers(
    newUsers: Array<{ name: string; username: string; email: string; role?: UserRole }>,
    fileName = 'users_import.xlsx'
  ): Observable<{ createdCount: number; skippedCount: number; log?: UserUploadLog }> {
    if (!this.http) {
      const currentList = this.usersSubject.value;
      let nextId = Math.max(0, ...currentList.map((u) => u.id || 0)) + 1;
      let createdCount = 0;
      let skippedCount = 0;
      const toAdd: User[] = [];
      const records: UserUploadLogRecord[] = [];

      for (const item of newUsers) {
        if (!item.name || !item.username) {
          skippedCount++;
          records.push({
            name: item.name || '',
            username: item.username || '',
            email: item.email || '',
            role: item.role || 'user',
            status: 'failed',
            reason: 'Name and Employee ID are required'
          });
          continue;
        }
        const exists = currentList.some(
          (u) =>
            u.username.toLowerCase() === item.username.toLowerCase() ||
            (item.email && u.email.toLowerCase() === item.email.toLowerCase())
        );
        if (exists) {
          skippedCount++;
          records.push({
            name: item.name,
            username: item.username,
            email: item.email || '',
            role: item.role || 'user',
            status: 'duplicate',
            reason: `User with ID ${item.username} or email already exists`
          });
          continue;
        }
        toAdd.push({
          id: nextId++,
          name: item.name,
          username: item.username,
          email: item.email || '',
          role: item.role || 'user',
          accessRequested: false
        });
        createdCount++;
        records.push({
          name: item.name,
          username: item.username,
          email: item.email || '',
          role: item.role || 'user',
          status: 'added',
          reason: 'Successfully imported'
        });
      }

      this.setUsers([...currentList, ...toAdd]);

      const currentUser = this.auth.currentUser();
      const mockLog: UserUploadLog = {
        id: (this.uploadLogsSubject.value[0]?.id || 0) + 1,
        uploadedAt: new Date().toISOString(),
        uploadedBy: {
          id: currentUser?.id || 1,
          name: currentUser?.name || 'Administrator',
          username: currentUser?.username || 'admin'
        },
        fileName,
        fileCount: 1,
        totalRecords: newUsers.length,
        addedCount: createdCount,
        duplicateCount: skippedCount,
        status: createdCount === newUsers.length ? 'completed' : (createdCount > 0 ? 'partial' : 'duplicate_only'),
        records
      };
      this.uploadLogsSubject.next([mockLog, ...this.uploadLogsSubject.value]);

      return of({ createdCount, skippedCount, log: mockLog });
    }

    const headers = this.getAuthHeaders();
    return this.http
      .post<{ status: string; data: { created: User[]; skipped: unknown[]; log?: UserUploadLog } }>(
        `${this.baseUrl}/bulk`,
        { users: newUsers, fileName, fileCount: 1 },
        { headers }
      )
      .pipe(
        map((res) => ({
          createdCount: res.data?.created?.length || 0,
          skippedCount: res.data?.skipped?.length || 0,
          log: res.data?.log
        })),
        tap(() => {
          this.refreshUsers().subscribe();
          this.getUploadLogs().subscribe();
        }),
        catchError(() => {
          const currentList = this.usersSubject.value;
          let nextId = Math.max(0, ...currentList.map((u) => u.id || 0)) + 1;
          let createdCount = 0;
          let skippedCount = 0;
          const toAdd: User[] = [];
          const records: UserUploadLogRecord[] = [];

          for (const item of newUsers) {
            if (!item.name || !item.username) {
              skippedCount++;
              records.push({
                name: item.name || '',
                username: item.username || '',
                email: item.email || '',
                role: item.role || 'user',
                status: 'failed',
                reason: 'Missing name or ID'
              });
              continue;
            }
            const exists = currentList.some(
              (u) =>
                u.username.toLowerCase() === item.username.toLowerCase() ||
                (item.email && u.email.toLowerCase() === item.email.toLowerCase())
            );
            if (exists) {
              skippedCount++;
              records.push({
                name: item.name,
                username: item.username,
                email: item.email || '',
                role: item.role || 'user',
                status: 'duplicate',
                reason: `User with ID ${item.username} or email already exists`
              });
              continue;
            }
            toAdd.push({
              id: nextId++,
              name: item.name,
              username: item.username,
              email: item.email || '',
              role: item.role || 'user',
              accessRequested: false
            });
            createdCount++;
            records.push({
              name: item.name,
              username: item.username,
              email: item.email || '',
              role: item.role || 'user',
              status: 'added',
              reason: 'Successfully imported'
            });
          }

          this.setUsers([...currentList, ...toAdd]);

          const currentUser = this.auth.currentUser();
          const fallbackLog: UserUploadLog = {
            id: (this.uploadLogsSubject.value[0]?.id || 0) + 1,
            uploadedAt: new Date().toISOString(),
            uploadedBy: {
              id: currentUser?.id || 1,
              name: currentUser?.name || 'Administrator',
              username: currentUser?.username || 'admin'
            },
            fileName,
            fileCount: 1,
            totalRecords: newUsers.length,
            addedCount: createdCount,
            duplicateCount: skippedCount,
            status: createdCount === newUsers.length ? 'completed' : (createdCount > 0 ? 'partial' : 'duplicate_only'),
            records
          };
          this.uploadLogsSubject.next([fallbackLog, ...this.uploadLogsSubject.value]);

          return of({ createdCount, skippedCount, log: fallbackLog });
        })
      );
  }

  private setUsers(users: User[]): void {
    const merged: User[] = [];
    const seenIds = new Set<number>();
    const seenUsernames = new Set<string>();

    for (const u of users) {
      if (!u || !u.id || !u.username) continue;
      const lower = u.username.toLowerCase();
      if (seenIds.has(u.id) || seenUsernames.has(lower)) continue;
      seenIds.add(u.id);
      seenUsernames.add(lower);
      merged.push({
        ...u,
        role: u.role || (u.username === 'u541023' ? 'admin' : 'user'),
        accessRequested: Boolean(u.accessRequested)
      });
    }

    for (const canon of this.initialUsers) {
      const lower = canon.username.toLowerCase();
      if (!seenIds.has(canon.id) && !seenUsernames.has(lower)) {
        seenIds.add(canon.id);
        seenUsernames.add(lower);
        merged.push(canon);
      }
    }

    merged.sort((a, b) => a.id - b.id);
    this.usersSubject.next(merged);
    try {
      localStorage.setItem('taskdesk_users', JSON.stringify(merged));
    } catch {
      /* storage unavailable */
    }
  }

  private loadStoredUsers(): User[] {
    try {
      const raw = localStorage.getItem('taskdesk_users');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged: User[] = [];
          const seenIds = new Set<number>();
          const seenUsernames = new Set<string>();

          for (const u of parsed) {
            if (!u || !u.id || !u.username) continue;
            const lower = u.username.toLowerCase();
            if (seenIds.has(u.id) || seenUsernames.has(lower)) continue;
            seenIds.add(u.id);
            seenUsernames.add(lower);
            const canon = this.initialUsers.find(
              (c) => c.id === u.id || c.username.toLowerCase() === lower
            );
            merged.push({
              ...(canon || u),
              role: u.role || (canon ? canon.role : (u.username === 'u541023' ? 'admin' : 'user')),
              accessRequested: Boolean(u.accessRequested)
            });
          }

          for (const canon of this.initialUsers) {
            const lower = canon.username.toLowerCase();
            if (!seenIds.has(canon.id) && !seenUsernames.has(lower)) {
              seenIds.add(canon.id);
              seenUsernames.add(lower);
              merged.push(canon);
            }
          }

          merged.sort((a, b) => a.id - b.id);
          return merged;
        }
      }
    } catch {
      /* storage unavailable */
    }
    return this.initialUsers;
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { User, UserRole } from '@app/user.model';
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

  bulkAddUsers(
    newUsers: Array<{ name: string; username: string; email: string; role?: UserRole }>
  ): Observable<{ createdCount: number; skippedCount: number }> {
    if (!this.http) {
      const currentList = this.usersSubject.value;
      let nextId = Math.max(0, ...currentList.map((u) => u.id || 0)) + 1;
      let createdCount = 0;
      let skippedCount = 0;
      const toAdd: User[] = [];

      for (const item of newUsers) {
        if (!item.name || !item.username) {
          skippedCount++;
          continue;
        }
        const exists = currentList.some(
          (u) =>
            u.username.toLowerCase() === item.username.toLowerCase() ||
            (item.email && u.email.toLowerCase() === item.email.toLowerCase())
        );
        if (exists) {
          skippedCount++;
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
      }

      this.setUsers([...currentList, ...toAdd]);
      return of({ createdCount, skippedCount });
    }

    const headers = this.getAuthHeaders();
    return this.http
      .post<{ status: string; data: { created: User[]; skipped: unknown[] } }>(
        `${this.baseUrl}/bulk`,
        { users: newUsers },
        { headers }
      )
      .pipe(
        map((res) => ({
          createdCount: res.data?.created?.length || 0,
          skippedCount: res.data?.skipped?.length || 0
        })),
        tap(() => this.refreshUsers().subscribe()),
        catchError(() => {
          const currentList = this.usersSubject.value;
          let nextId = Math.max(0, ...currentList.map((u) => u.id || 0)) + 1;
          let createdCount = 0;
          let skippedCount = 0;
          const toAdd: User[] = [];

          for (const item of newUsers) {
            if (!item.name || !item.username) {
              skippedCount++;
              continue;
            }
            const exists = currentList.some(
              (u) =>
                u.username.toLowerCase() === item.username.toLowerCase() ||
                (item.email && u.email.toLowerCase() === item.email.toLowerCase())
            );
            if (exists) {
              skippedCount++;
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
          }

          this.setUsers([...currentList, ...toAdd]);
          return of({ createdCount, skippedCount });
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

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '@app/user.model';
import { environment } from '@env/environment';
import { catchError, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly baseUrl = `${environment.apiUrl}/users`;

  private users: User[] = [
    { id: 1, name: 'Anchal', username: 'u541023', email: 'anchal@taskdesk.dev' },
    { id: 2, name: 'Jyoti Singh', username: 'u541024', email: 'jyoti.singh@taskdesk.dev' },
    { id: 3, name: 'Vivek Kumar', username: 'u541025', email: 'vivek.kumar@taskdesk.dev' },
    { id: 4, name: 'Nikitha Amaresh', username: 'u541026', email: 'nikitha.amaresh@taskdesk.dev' }
  ];

  constructor() {
    if (this.http) {
      this.http
        .get<{ status: string; data: User[] }>(this.baseUrl)
        .pipe(
          map((res) => res.data),
          catchError(() => of(null))
        )
        .subscribe((data) => {
          if (Array.isArray(data) && data.length > 0) {
            this.users = data;
          }
        });
    }
  }

  getUsers(): User[] {
    return this.users;
  }

  getUserById(id: number): User | undefined {
    return this.users.find((u) => u.id === id);
  }
}

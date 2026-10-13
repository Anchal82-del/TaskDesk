import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { AccessRequest } from './access-request.model';
import { AuthService } from './auth';
import { NotificationService } from './notification';
import { environment } from '@env/environment';

interface ApiResponse<T> {
  status: string;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AccessRequestService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly baseUrl = `${environment.apiUrl}/access-requests`;

  readonly pendingRequests = signal<AccessRequest[]>([]);
  readonly myLatestRequest = signal<AccessRequest | null>(null);

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  fetchPending(): Observable<AccessRequest[]> {
    if (!this.http) {
      return of(this.pendingRequests());
    }

    return this.http
      .get<ApiResponse<AccessRequest[]>>(`${this.baseUrl}/pending`, {
        headers: this.getHeaders()
      })
      .pipe(
        map((res) => res.data || []),
        tap((list) => this.pendingRequests.set(list)),
        catchError(() => of(this.pendingRequests()))
      );
  }

  fetchMyRequest(): Observable<AccessRequest | null> {
    if (!this.http) {
      return of(this.myLatestRequest());
    }

    return this.http
      .get<ApiResponse<AccessRequest | null>>(`${this.baseUrl}/my`, {
        headers: this.getHeaders()
      })
      .pipe(
        map((res) => res.data || null),
        tap((req) => this.myLatestRequest.set(req)),
        catchError(() => of(this.myLatestRequest()))
      );
  }

  submitRequest(): Observable<AccessRequest> {
    const user = this.auth.getCurrentUser();
    if (!user) {
      throw new Error('You must be signed in to submit an access request.');
    }

    const payload = {
      userId: user.id,
      employeeId: user.username,
      requesterName: user.name,
      requesterEmail: user.email
    };

    if (!this.http) {
      const localReq: AccessRequest = {
        id: Date.now(),
        userId: user.id,
        employeeId: user.username,
        requesterName: user.name,
        requesterEmail: user.email,
        status: 'pending',
        createdAt: new Date()
      };
      this.pendingRequests.set([...this.pendingRequests(), localReq]);
      this.myLatestRequest.set(localReq);
      this.auth.updateCurrentUserAccessRequested(true);
      this.notification.addForUser(
        1,
        `${user.name} (${user.username}) requested Admin access.`
      );
      return of(localReq);
    }

    return this.http
      .post<ApiResponse<AccessRequest>>(this.baseUrl, payload, {
        headers: this.getHeaders()
      })
      .pipe(
        map((res) => res.data),
        tap((created) => {
          this.pendingRequests.set([...this.pendingRequests(), created]);
          this.myLatestRequest.set(created);
          this.auth.updateCurrentUserAccessRequested(true);
          this.notification.fetchNotifications().subscribe();
        })
      );
  }

  approveRequest(requestId: number): Observable<AccessRequest> {
    const target = this.pendingRequests().find((r) => r.id === requestId);

    if (!this.http) {
      if (target) {
        target.status = 'approved';
        this.pendingRequests.set(this.pendingRequests().filter((r) => r.id !== requestId));
        this.notification.addForUser(
          target.userId,
          'Your admin access request has been approved.'
        );
      }
      return of(target as AccessRequest);
    }

    return this.http
      .post<ApiResponse<{ request: AccessRequest }>>(
        `${this.baseUrl}/${requestId}/approve`,
        {},
        { headers: this.getHeaders() }
      )
      .pipe(
        map((res) => res.data.request),
        tap(() => {
          this.pendingRequests.set(
            this.pendingRequests().filter((r) => r.id !== requestId)
          );
          this.notification.fetchNotifications().subscribe();
        })
      );
  }

  declineRequest(requestId: number): Observable<AccessRequest> {
    const target = this.pendingRequests().find((r) => r.id === requestId);

    if (!this.http) {
      if (target) {
        target.status = 'declined';
        this.pendingRequests.set(this.pendingRequests().filter((r) => r.id !== requestId));
        this.notification.addForUser(
          target.userId,
          'Your admin access request was declined.'
        );
      }
      return of(target as AccessRequest);
    }

    return this.http
      .post<ApiResponse<{ request: AccessRequest }>>(
        `${this.baseUrl}/${requestId}/decline`,
        {},
        { headers: this.getHeaders() }
      )
      .pipe(
        map((res) => res.data.request),
        tap(() => {
          this.pendingRequests.set(
            this.pendingRequests().filter((r) => r.id !== requestId)
          );
          this.notification.fetchNotifications().subscribe();
        })
      );
  }

  cancelRequest(): Observable<void> {
    if (!this.http) {
      const cur = this.auth.getCurrentUser();
      if (cur) {
        this.pendingRequests.set(
          this.pendingRequests().filter((r) => r.userId !== cur.id)
        );
        this.auth.updateCurrentUserAccessRequested(false);
      }
      return of(undefined);
    }

    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/my`, {
        headers: this.getHeaders()
      })
      .pipe(
        map(() => undefined),
        tap(() => {
          const cur = this.auth.getCurrentUser();
          if (cur) {
            this.pendingRequests.set(
              this.pendingRequests().filter((r) => r.userId !== cur.id)
            );
            this.auth.updateCurrentUserAccessRequested(false);
          }
          this.notification.fetchNotifications().subscribe();
        })
      );
  }
}

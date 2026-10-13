import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from '@app/user';
import { AuthService } from '@app/auth';
import { AccessRequestService } from '@app/access-request.service';
import { ToastService } from '@app/shared/toast/toast.service';
import { User } from '@app/user.model';
import { AccessRequest } from '@app/access-request.model';
import { ConfirmDialogComponent } from '@app/confirm-dialog/confirm-dialog';
import { getAvatarInitials } from '../shared/avatar-initials';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DatePipe, ConfirmDialogComponent],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminComponent {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly accessRequestService = inject(AccessRequestService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly getInitials = getAvatarInitials;
  readonly currentUser = this.auth.currentUser;
  readonly isSuperAdmin = this.auth.isSuperAdmin;
  readonly isAdmin = this.auth.isAdmin;

  readonly activeTab = signal<'requests' | 'admins'>('requests');
  readonly processingRequestId = signal<number | null>(null);
  readonly highlightedRequestId = signal<number | null>(null);

  readonly rawUsers = toSignal<User[], User[]>(this.userService.users$, {
    initialValue: this.userService.getUsers()
  });

  readonly pendingRequests = this.accessRequestService.pendingRequests;

  readonly adminAccounts = computed(() => {
    return this.rawUsers().filter(
      (u) => u.role === 'admin' || u.username === 'u541023'
    );
  });

  readonly adminPendingRevoke = signal<User | null>(null);
  readonly isRevoking = signal(false);

  readonly revokeConfirmMessage = computed(() => {
    const user = this.adminPendingRevoke();
    return `Are you sure you want to revoke administrator access from ${user?.name || 'this user'}? They will be demoted to standard user permissions.`;
  });

  constructor() {
    this.refreshData();

    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'requests' || tab === 'admins') {
        this.activeTab.set(tab);
      }
      const reqId = params.get('requestId');
      if (reqId) {
        this.highlightedRequestId.set(Number(reqId));
        this.activeTab.set('requests');
      }
    });
  }

  refreshData(): void {
    this.accessRequestService.fetchPending().subscribe();
    this.userService.refreshUsers().subscribe();
  }

  setActiveTab(tab: 'requests' | 'admins'): void {
    this.activeTab.set(tab);
  }

  isSuperAdminUser(u: User | null | undefined): boolean {
    return Boolean(u && u.username === 'u541023');
  }

  approveRequest(req: AccessRequest): void {
    if (!this.isAdmin()) {
      this.toast.error('Forbidden', 'Only administrators can approve access requests.');
      return;
    }

    this.processingRequestId.set(req.id);
    this.accessRequestService.approveRequest(req.id).subscribe({
      next: () => {
        this.processingRequestId.set(null);
        if (this.highlightedRequestId() === req.id) {
          this.highlightedRequestId.set(null);
        }
        this.toast.success(
          'Request Approved',
          `Administrator access granted to ${req.requesterName}.`
        );
        this.userService.refreshUsers().subscribe();
      },
      error: (err: unknown) => {
        this.processingRequestId.set(null);
        const msg = err instanceof Error ? err.message : 'Failed to approve request.';
        this.toast.error('Approval Failed', msg);
      }
    });
  }

  declineRequest(req: AccessRequest): void {
    if (!this.isAdmin()) {
      this.toast.error('Forbidden', 'Only administrators can decline access requests.');
      return;
    }

    this.processingRequestId.set(req.id);
    this.accessRequestService.declineRequest(req.id).subscribe({
      next: () => {
        this.processingRequestId.set(null);
        if (this.highlightedRequestId() === req.id) {
          this.highlightedRequestId.set(null);
        }
        this.toast.info(
          'Request Declined',
          `Access request from ${req.requesterName} was declined.`
        );
        this.userService.refreshUsers().subscribe();
      },
      error: (err: unknown) => {
        this.processingRequestId.set(null);
        const msg = err instanceof Error ? err.message : 'Failed to decline request.';
        this.toast.error('Decline Failed', msg);
      }
    });
  }

  canRevokeAdmin(u: User): boolean {
    if (!this.isAdmin()) return false;
    if (this.isSuperAdminUser(u)) return false;
    const cur = this.currentUser();
    if (cur && (cur.id === u.id || cur.username === u.username)) return false;
    return true;
  }

  confirmRevokeAdmin(u: User): void {
    if (!this.isAdmin()) {
      this.toast.error('Forbidden', 'Only administrators can revoke administrator access.');
      return;
    }
    if (this.isSuperAdminUser(u)) {
      this.toast.error(
        'Action Not Allowed',
        'The Super Admin account cannot have administrator access revoked.'
      );
      return;
    }
    const cur = this.currentUser();
    if (cur && (cur.id === u.id || cur.username === u.username)) {
      this.toast.error(
        'Action Not Allowed',
        'You cannot revoke your own administrator access.'
      );
      return;
    }
    this.adminPendingRevoke.set(u);
  }

  cancelRevoke(): void {
    this.adminPendingRevoke.set(null);
  }

  executeRevoke(): void {
    const target = this.adminPendingRevoke();
    if (!target) return;

    this.isRevoking.set(true);
    this.userService.revokeAdminAccess(target.id).subscribe({
      next: () => {
        this.isRevoking.set(false);
        this.adminPendingRevoke.set(null);
        this.toast.info(
          'Access Revoked',
          `Administrator access revoked for ${target.name}.`
        );
      },
      error: (err: unknown) => {
        this.isRevoking.set(false);
        const msg = err instanceof Error ? err.message : 'Could not revoke admin access.';
        this.toast.error('Revocation Failed', msg);
      }
    });
  }
}

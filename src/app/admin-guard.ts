import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@app/auth';
import { ToastService } from '@app/shared/toast/toast.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (auth.isLoggedIn() && auth.isAdmin()) {
    if (!auth.adminModeActive()) {
      auth.setAdminMode(true);
    }
    return true;
  }

  toast.warning(
    'Access Denied',
    'The Admin Console is restricted to authorized administrators.'
  );
  router.navigate(['/dashboard']);
  return false;
};

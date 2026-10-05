import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '@app/auth';

// Sends the user back to the login page when the API says their session is no longer valid.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized) {
        auth.logout();
        router.navigate(['/']);
      }
      return throwError(() => error);
    })
  );
};

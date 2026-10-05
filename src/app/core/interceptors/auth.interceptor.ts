import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@app/auth';

// Adds the bearer token to every API request once the user has one.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(request);
};

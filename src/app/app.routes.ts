import { Routes } from '@angular/router';
import { authGuard } from '@app/auth-guard';

// Every page is lazy-loaded so it is only downloaded when the user first visits it.
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('@app/login/login').then((m) => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@app/app-shell/app-shell').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('@app/dashboard/dashboard').then((m) => m.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('@app/users/users').then((m) => m.UsersComponent)
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('@app/settings-page/settings-page').then((m) => m.SettingsPageComponent)
      }
    ]
  },
  {
    path: 'logged-out',
    loadComponent: () => import('@app/logged-out/logged-out').then((m) => m.LoggedOutComponent)
  },
  { path: '**', redirectTo: '' }
];

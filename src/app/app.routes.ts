import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { DashboardComponent } from './dashboard/dashboard';
import { LoggedOutComponent } from './logged-out/logged-out';
import { UsersComponent } from './users/users';
import { SettingsPageComponent } from './settings-page/settings-page';
import { AppShellComponent } from './app-shell/app-shell';
import { authGuard } from './auth-guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'users', component: UsersComponent },
      { path: 'settings', component: SettingsPageComponent }
    ]
  },
  { path: 'logged-out', component: LoggedOutComponent }
];

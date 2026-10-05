import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logged-out',
  standalone: true,
  templateUrl: './logged-out.html',
  styleUrl: './logged-out.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoggedOutComponent {
  private readonly router = inject(Router);

  backToLogin(): void {
    this.router.navigate(['/']);
  }
}

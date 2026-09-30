import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logged-out',
  standalone: true,
  imports: [],
  templateUrl: './logged-out.html',
  styleUrl: './logged-out.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoggedOutComponent {
  private readonly router = inject(Router);

  backToLogin(): void {
    this.router.navigate(['/']);
  }
}

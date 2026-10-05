import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/auth';

const USERNAME_PREFIX = 'u';
const USERNAME_DIGIT_COUNT = 6;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  showPassword = false;
  errorMessage = '';
  isSubmitting = false;

  loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [false]
  });

  get passwordInputType(): string {
    return this.showPassword ? 'text' : 'password';
  }

  get passwordToggleLabel(): string {
    return this.showPassword ? 'Hide' : 'Show';
  }

  get submitLabel(): string {
    return this.isSubmitting ? 'Signing in…' : 'Sign in';
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';

    const { username, password } = this.loginForm.controls;

    const usernameError = this.getUsernameError(username.value);
    if (usernameError) {
      this.errorMessage = usernameError;
      return;
    }

    if (password.hasError('required')) {
      this.errorMessage = 'Password is required to continue.';
      return;
    }

    this.isSubmitting = true;
    setTimeout(() => {
      this.auth.login();
      this.router.navigate(['/dashboard']);
    }, 500);
  }

  // Checks the username in stages so the message says exactly what to fix.
  // Returns an empty string when the username is valid.
  private getUsernameError(rawValue: string): string {
    const value = rawValue.trim();

    if (!value) {
      return 'Username is required to continue.';
    }
    if (!value.startsWith(USERNAME_PREFIX)) {
      return `Username must begin with the lowercase letter "${USERNAME_PREFIX}".`;
    }

    const digits = value.slice(USERNAME_PREFIX.length);

    if (!/^\d*$/.test(digits)) {
      return `After the letter "${USERNAME_PREFIX}", the username may contain digits only.`;
    }
    if (digits.length !== USERNAME_DIGIT_COUNT) {
      return (
        `Username must contain exactly ${USERNAME_DIGIT_COUNT} digits after the letter ` +
        `"${USERNAME_PREFIX}".`
      );
    }
    return '';
  }
}

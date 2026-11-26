import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly passwordVisible = signal(false);
  private readonly emailPattern = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';
  private readonly passwordPattern = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$';
  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.pattern(this.emailPattern)]],
    password: ['', [Validators.required, Validators.pattern(this.passwordPattern)]],
  });

  getPasswordRequirements(password: string): string[] {
    const missing: string[] = [];

    if (password.length < 8) {
      missing.push('At least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
      missing.push('At least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      missing.push('At least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      missing.push('At least one number');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      missing.push('At least one special character');
    }

    return missing;
  }

  submit(): void {
    if (this.loginForm.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.loginForm.getRawValue();

    this.authService
      .login(email, password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.cartService.load();
          this.cartService.clearNotice();
          this.router.navigateByUrl('/');
        },
        error: (error: HttpErrorResponse | Error) => {
          this.error.set(
            error instanceof HttpErrorResponse
              ? error.error?.detail ?? 'Login failed. Check your email and password.'
              : error.message,
          );
        },
      });
  }
}

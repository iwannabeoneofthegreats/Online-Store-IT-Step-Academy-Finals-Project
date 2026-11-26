import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly passwordVisible = signal(false);
  readonly verificationPending = signal(false);
  readonly verified = signal(false);
  readonly email = signal('');
  private readonly emailPattern = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';
  private readonly passwordPattern = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$';
  readonly registrationForm = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.pattern(this.emailPattern)]],
    password: ['', [Validators.required, Validators.pattern(this.passwordPattern)]],
  });
  readonly verificationForm = this.formBuilder.nonNullable.group({
    code: ['', Validators.required],
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

  submitRegistration(): void {
    if (this.registrationForm.invalid || this.loading()) {
      return;
    }

    const { firstName, lastName, email, password } =
      this.registrationForm.getRawValue();
    this.email.set(email);
    this.loading.set(true);
    this.error.set('');

    this.authService
      .register(firstName, lastName, email, password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.verificationPending.set(true),
        error: (error: HttpErrorResponse) => {
          this.error.set(
            error.error?.detail ?? 'Registration failed. Please try again.',
          );
        },
      });
  }

  submitVerification(): void {
    if (this.verificationForm.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const { code } = this.verificationForm.getRawValue();

    this.authService
      .verifyEmail(this.email(), code)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.verified.set(true),
        error: (error: HttpErrorResponse) => {
          this.error.set(
            error.error?.detail ?? 'Email verification failed. Check the code.',
          );
        },
      });
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}

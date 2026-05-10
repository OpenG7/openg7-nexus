import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';

@Component({
  standalone: true,
  selector: 'og7-reset-password-page',
  imports: [ReactiveFormsModule, TranslateModule, RouterLink],
  templateUrl: './reset-password.page.html',
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Reset Password » du dossier « domains/auth/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns ResetPasswordPage gérée par le framework.
 */
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly apiError = signal<string | null>(null);
  protected readonly success = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly confirmPasswordVisible = signal(false);
  protected readonly passwordStrengthScore = signal(0);
  protected readonly passwordStrengthLabelKey = computed(() => {
    switch (this.passwordStrengthScore()) {
      case 3:
        return 'auth.resetPassword.passwordStrength.strong';
      case 2:
        return 'auth.resetPassword.passwordStrength.medium';
      default:
        return 'auth.resetPassword.passwordStrength.weak';
    }
  });
  protected readonly passwordStrengthPercent = computed(() => {
    const score = this.passwordStrengthScore();
    if (score <= 0) {
      return 10;
    }
    return score * 33.3333;
  });
  protected readonly passwordStrengthBarColor = computed(() => {
    switch (this.passwordStrengthScore()) {
      case 3:
        return 'var(--og7-color-success)';
      case 2:
        return 'var(--og7-color-warning)';
      default:
        return 'var(--og7-color-error)';
    }
  });
  protected readonly passwordStrengthLabelColor = computed(() => {
    switch (this.passwordStrengthScore()) {
      case 3:
        return 'var(--og7-color-success)';
      case 2:
        return 'var(--og7-color-warning)';
      default:
        return 'var(--og7-color-error)';
    }
  });

  protected readonly form = this.fb.nonNullable.group(
    {
      token: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(10)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordsMatchValidator },
  );

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.form.patchValue({ token });
    }
  }

  protected onSubmit(): void {
    if (this.loading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.apiError.set(null);
    this.success.set(false);
    this.loading.set(true);

    const { token, password } = this.form.getRawValue();
    const payload = { token, password };

    this.auth
      .resetPassword(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.success.set(true);
          this.form.reset({ token: '', password: '', confirmPassword: '' });
          this.passwordStrengthScore.set(0);
          this.passwordVisible.set(false);
          this.confirmPasswordVisible.set(false);
          setTimeout(() => {
            void this.router.navigate(['/login']);
          }, 900);
        },
        error: (error) => {
          const message = this.resolveErrorMessage(error);
          this.apiError.set(message);
        },
      });
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((value) => !value);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((value) => !value);
  }

  protected onPasswordInput(): void {
    const password = this.form.controls.password.value ?? '';
    this.passwordStrengthScore.set(this.calculatePasswordStrength(password));
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (!confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  private calculatePasswordStrength(password: string): number {
    if (!password.trim()) {
      return 0;
    }

    let score = 0;

    if (password.length >= 10) {
      score += 1;
    }

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score += 1;
    }

    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      score += 1;
    }

    return Math.max(1, Math.min(score, 3));
  }

  private resolveErrorMessage(error: unknown): string {
    if (typeof error === 'string' && error.trim()) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      const payload = error.error;
      if (typeof payload === 'string' && payload.trim()) {
        return payload;
      }
    }

    return this.translate.instant('auth.errors.resetPassword');
  }
}

// src/app/features/auth/login/login.component.ts
import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnChanges {
  @Input()  visible = false;
  @Output() close = new EventEmitter<void>();
  @Output() forgot = new EventEmitter<void>();

  f: FormGroup;
  loading = false;
  errorMsg: string | null = null;

  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.f = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        // Descomenta si quieres password fuerte:
        // Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/)
      ]]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Al abrir el modal, limpia estados previos
    if (changes['visible']?.currentValue) {
      this.errorMsg = null;
      this.f.reset();
      this.loading = false;
    }
  }

  onSubmit() {
    this.errorMsg = null;
    if (this.f.invalid) {
      this.f.markAllAsTouched();
      return;
    }

    const { email, password } = this.f.getRawValue() as { email: string; password: string };

    this.loading = true;
    this.auth.login(email, password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.auth.touch();
          this.close.emit();
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.errorMsg = err?.error?.message || err?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        }
      });
  }

  onBackdrop(ev: MouseEvent) {
    if ((ev.target as HTMLElement).classList.contains('login-overlay')) {
      this.close.emit();
    }
  }

  // Getters de conveniencia
  get email()    { return this.f.get('email'); }
  get password() { return this.f.get('password'); }
}

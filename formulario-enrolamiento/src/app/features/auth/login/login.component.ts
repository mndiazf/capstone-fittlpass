import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  @Input()  visible = false;
  @Output() close = new EventEmitter<void>();
  @Output() forgot = new EventEmitter<void>();
  @Output() register = new EventEmitter<void>();

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
        Validators.minLength(6)
        // Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/) // si quieres exigir fuerte
      ]]
    });
  }

  async onSubmit() {
    this.errorMsg = null;
    if (this.f.invalid) { this.f.markAllAsTouched(); return; }

    this.loading = true;
    const { email, password } = this.f.getRawValue() as { email: string; password: string };

    const ok = this.auth.loginDemo(email, password); // DEMO
    this.loading = false;

    if (ok) {
      this.close.emit();
      this.router.navigate(['/profile']);
    } else {
      this.errorMsg = 'Credenciales inválidas (demo).';
    }
  }

  onBackdrop(ev: MouseEvent) {
    if ((ev.target as HTMLElement).classList.contains('login-overlay')) {
      this.close.emit();
    }
  }

  get email() { return this.f.get('email'); }
  get password() { return this.f.get('password'); }
}

import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserProfile } from '../../../core/services/auth.service';

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
        Validators.minLength(6)
        // Si quieres password fuerte, descomenta:
        // Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
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

  async onSubmit() {
    this.errorMsg = null;
    if (this.f.invalid) { this.f.markAllAsTouched(); return; }

    this.loading = true;
    const { email, password } = this.f.getRawValue() as { email: string; password: string };
    const emailNorm = (email || '').trim().toLowerCase();

    try {
      // 1) Cargar perfil guardado (del checkout)
      const profile = this.loadStoredProfile();
      if (!profile || !profile.email) {
        this.errorMsg = 'No encontramos una cuenta registrada. Por favor regístrate primero.';
        return;
      }

      const storedEmailNorm = String(profile.email).trim().toLowerCase();

      // 2) Validar correo
      if (emailNorm !== storedEmailNorm) {
        this.errorMsg = 'El correo ingresado no está registrado.';
        return;
      }

      // 3) Validar contraseña (usa la guardada en texto plano para este flujo demo)
      const storedPlain = localStorage.getItem('userPassword');
      if (storedPlain === null) {
        this.errorMsg = 'Tu cuenta no tiene contraseña guardada. Restablece tu contraseña o regístrate nuevamente.';
        return;
      }
      if (storedPlain !== password) {
        this.errorMsg = 'La contraseña es incorrecta.';
        return;
      }

      // 4) Crear sesión real con el perfil almacenado
      this.auth.loginWithProfile(profile);
      this.auth.touch();
      this.close.emit();
      this.router.navigate(['/dashboard']);
    } catch {
      this.errorMsg = 'Ocurrió un problema al iniciar sesión. Intenta nuevamente.';
    } finally {
      this.loading = false;
    }
  }

  onBackdrop(ev: MouseEvent) {
    if ((ev.target as HTMLElement).classList.contains('login-overlay')) {
      this.close.emit();
    }
  }

  get email()    { return this.f.get('email'); }
  get password() { return this.f.get('password'); }

  // ===== Helpers =====

  private loadStoredProfile(): UserProfile | null {
    // Perfil creado en el checkout
    const raw = localStorage.getItem('userProfile');
    if (raw) {
      try { return JSON.parse(raw) as UserProfile; } catch { /* ignore */ }
    }

    // Compatibilidad con un posible guardado anterior (fitpass_user demo)
    const rawUser = localStorage.getItem('fitpass_user');
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        const [firstName, ...rest] = (u.name || 'Usuario').split(' ');
        return {
          firstName: firstName || 'Usuario',
          lastName:  rest.join(' '),
          email: u.email,
          phone: '',
          rut: '',
          status: 'active'
        } as UserProfile;
      } catch { /* ignore */ }
    }
    return null;
  }
}

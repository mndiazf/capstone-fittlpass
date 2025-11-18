// src/app/features/auth/login/login.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth } from '../../../core/services/auth/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  // Puede ser email o RUT, pero dejo el nombre "email" para no romper la template
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  hidePassword: boolean = true;

  constructor(
    private router: Router,
    private auth: Auth
  ) {
    // Si ya está logueado y el token sigue vigente, redirigir al dashboard
    if (this.auth.isAuthenticated) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLogin(): void {
    this.errorMessage = '';

    // Validaciones básicas
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor ingrese email/RUT y contraseña';
      return;
    }

    this.isLoading = true;

    // Llamar al backend admin: /api/admin/auth/login
    this.auth.login(this.email, this.password).subscribe({
      next: (payload) => {
        console.log('✅ Login admin exitoso. Payload JWT:', payload);
        this.isLoading = false;

        // Aquí puedes leer branch actual, roles, etc. desde el servicio
        // const branch = this.auth.currentBranch;

        this.router.navigate(['/dashboard']); // o '/admin/dashboard' si lo prefieres
      },
      error: (error) => {
        console.error('❌ Error en login admin:', error);

        // Mensaje amigable desde el backend si viene definido
        if (error?.error?.message) {
          this.errorMessage = error.error.message;
        } else if (error?.message) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'Credenciales inválidas o error en el servidor';
        }

        this.isLoading = false;
      }
    });
  }

  goToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }
}

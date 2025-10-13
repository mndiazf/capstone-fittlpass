// src/app/core/guards/auth.guard.ts

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  // Verificar si existe token en localStorage
  const token = localStorage.getItem('gym_token');
  const userData = localStorage.getItem('gym_user');
  
  if (!token || !userData) {
    // Usuario no autenticado
    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Verificar si la sesión no ha expirado
  if (!authService.isSessionValid()) {
    router.navigate(['/auth/login'], {
      queryParams: { reason: 'session_expired' }
    });
    return false;
  }
  
  // Usuario autenticado y sesión válida
  return true;
};
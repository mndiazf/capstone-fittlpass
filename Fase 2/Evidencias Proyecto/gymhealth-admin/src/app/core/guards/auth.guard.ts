// src/app/core/guards/auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const TOKEN_KEY = 'fitpass_admin_token';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);

  const token = localStorage.getItem(TOKEN_KEY);

  // ⛔ SIN TOKEN → a login
  if (!token) {
    if (state.url !== '/auth/login') {
      router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }
    return false;
  }

  // ✅ Hay token → dejamos pasar
  return true;
};

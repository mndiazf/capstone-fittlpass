// src/app/core/guards/permission.guard.ts

import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  Route,
  CanMatch,
  UrlSegment,
  UrlTree,
} from '@angular/router';
import { Auth } from '../services/auth/auth';

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate, CanMatch {
  constructor(
    private auth: Auth,
    private router: Router,
  ) {}

  private checkPermission(
    permission?: string | string[],
  ): boolean | UrlTree {
    // 1) No autenticado -> al login
    if (!this.auth.isAuthenticated) {
      return this.router.parseUrl('/auth/login');
    }

    // 2) Si la ruta no define permiso, la dejamos pasar
    if (!permission) {
      return true;
    }

    const required = Array.isArray(permission) ? permission : [permission];

    const has = this.auth.hasAnyPermission(required);
    if (has) {
      return true;
    }

    // 3) No tiene permisos -> lo sacamos a una vista segura
    // puedes usar '/dashboard' o una vista '/forbidden'
    return this.router.parseUrl('/dashboard');
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): boolean | UrlTree {
    const perm = route.data['permission'] as string | string[] | undefined;
    return this.checkPermission(perm);
  }

  canMatch(
    route: Route,
    _segments: UrlSegment[],
  ): boolean | UrlTree {
    const perm = route.data?.['permission'] as string | string[] | undefined;
    return this.checkPermission(perm);
  }
}

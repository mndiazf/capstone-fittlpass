// src/app/core/services/auth/auth.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';

const TOKEN_KEY = 'fitpass_admin_token';
const PAYLOAD_KEY = 'fitpass_admin_payload';

export interface AdminLoginResponse {
  token: string;
  tokenType: string; // "Bearer"
}

export interface AdminJwtPayloadUser {
  id: string;
  email: string;
  rut: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  middleName: string | null;
  phone: string | null;
  accessStatus: string;
  status: string;
}

export interface AdminJwtPayloadBranch {
  id: string;
  code: string;
  name: string;
}

export interface AdminJwtPayloadRole {
  branchId: string;
  branchCode: string;
  branchName: string;
  roleId: string;
  roleCode: string;
  roleName: string;
}

// 👇 tipamos bien los permisos (para usar code)
export interface AdminJwtPermission {
  code: string;
  name: string;
  canView: boolean;
  canEdit: boolean;
}

export interface AdminJwtPayloadProfile {
  profileId: string;
  profileName: string;
  profileDescription: string;
  branch: AdminJwtPayloadBranch;
  permissions: AdminJwtPermission[];
}

export interface AdminJwtPayload {
  sub: string;
  iat: number;
  exp: number;
  isStaff: boolean;
  user: AdminJwtPayloadUser;
  branches: AdminJwtPayloadBranch[];
  roles: AdminJwtPayloadRole[];
  profiles: AdminJwtPayloadProfile[];
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  // ⚠️ ajusta si cambias el endpoint del backend
  private readonly baseUrl = 'http://localhost:3000/api/admin/auth';

  private currentPayloadSubject = new BehaviorSubject<AdminJwtPayload | null>(
    this.loadPayloadFromStorage()
  );

  public currentPayload$ = this.currentPayloadSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ========== LOGIN ==========

  login(emailOrRut: string, password: string): Observable<AdminJwtPayload> {
    return this.http
      .post<AdminLoginResponse>(`${this.baseUrl}/login`, {
        emailOrRut,
        password,
      })
      .pipe(
        map((res) => {
          const token = res.token;
          const payload = this.decodeToken(token);

          if (!payload) {
            throw new Error('TOKEN_INVALIDO');
          }

          // Guardar en localStorage
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(PAYLOAD_KEY, JSON.stringify(payload));

          // Actualizar estado en memoria
          this.currentPayloadSubject.next(payload);

          return payload;
        })
      );
  }

  // ========== LOGOUT ==========

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PAYLOAD_KEY);
    this.currentPayloadSubject.next(null);
  }

  // ========== HELPERS TOKEN ==========

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get decodedToken(): AdminJwtPayload | null {
    return this.currentPayloadSubject.value;
  }

  get isAuthenticated(): boolean {
    const payload = this.currentPayloadSubject.value;
    if (!payload) return false;
    return !this.isTokenExpired(payload);
  }

  /** Devuelve true si el token ya expiró */
  isTokenExpired(payload?: AdminJwtPayload | null): boolean {
    const p = payload ?? this.currentPayloadSubject.value;
    if (!p || !p.exp) return true;

    const nowInSeconds = Math.floor(Date.now() / 1000);
    return nowInSeconds >= p.exp;
  }

  /** Devuelve los minutos restantes de sesión (aprox) */
  getRemainingMinutes(): number {
    const p = this.currentPayloadSubject.value;
    if (!p || !p.exp) return 0;

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const diffSec = p.exp - nowInSeconds;
    return diffSec > 0 ? Math.floor(diffSec / 60) : 0;
  }

  // ========== INFO CONVENIENTE (usuario / rol / branch) ==========

  /** Usuario admin logueado (datos del JWT) */
  get currentUser(): AdminJwtPayloadUser | null {
    return this.currentPayloadSubject.value?.user ?? null;
  }

  /** Sede actual (por ahora la primera, luego puedes manejar selector) */
  get currentBranch(): AdminJwtPayloadBranch | null {
    const branches = this.currentPayloadSubject.value?.branches ?? [];
    return branches.length > 0 ? branches[0] : null;
  }

  /** Roles del admin */
  get roles(): AdminJwtPayloadRole[] {
    return this.currentPayloadSubject.value?.roles ?? [];
  }

  /** Perfiles del admin */
  get profiles(): AdminJwtPayloadProfile[] {
    return this.currentPayloadSubject.value?.profiles ?? [];
  }

  /** Nombre del role principal (por ahora el primero) → para el sidebar */
  get adminRoleName(): string | null {
    const r = this.roles;
    if (!r || r.length === 0) return null;
    return r[0].roleName;
  }

  get adminEmail(): string | null {
    return this.currentUser?.email ?? null;
  }

  get adminName(): string | null {
    const u = this.currentUser;
    if (!u) return null;
    // Puedes agregar secondLastName si quieres
    return [u.firstName, u.lastName].filter(Boolean).join(' ');
  }

  get adminInitials(): string | null {
    const u = this.currentUser;
    if (!u) return null;

    const parts = [u.firstName, u.lastName].filter(Boolean);
    const initials = parts
      .map((p) => p.trim()[0])
      .join('')
      .toUpperCase();

    return initials || null;
  }

  /** Todos los códigos de permisos de UI asignados al usuario */
  get permissionCodes(): string[] {
    const payload = this.currentPayloadSubject.value;
    if (!payload) return [];

    const codes = new Set<string>();

    for (const profile of payload.profiles ?? []) {
      for (const perm of profile.permissions ?? []) {
        if (perm && perm.code) {
          codes.add(perm.code);
        }
      }
    }

    return Array.from(codes);
  }

  /** Helper para guards y lógica de UI */
  hasPermission(code: string): boolean {
    return this.permissionCodes.includes(code);
  }

  /** Helper para cuando una ruta admite varios permisos posibles */
  hasAnyPermission(codes: string[]): boolean {
    const current = this.permissionCodes;
    return codes.some(c => current.includes(c));
  }

  // ========== PRIVADOS ==========

  /** Intenta decodificar el JWT sin verificar firma (solo lectura de payload) */
  private decodeToken(token: string): AdminJwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(payloadJson);
    } catch (e) {
      console.error('Error decodificando JWT', e);
      return null;
    }
  }

  private loadPayloadFromStorage(): AdminJwtPayload | null {
    try {
      const stored = localStorage.getItem(PAYLOAD_KEY);
      if (!stored) return null;

      const payload: AdminJwtPayload = JSON.parse(stored);

      // si ya expiró, limpiamos
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (!payload.exp || nowInSeconds >= payload.exp) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(PAYLOAD_KEY);
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}

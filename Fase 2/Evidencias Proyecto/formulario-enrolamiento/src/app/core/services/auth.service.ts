// src/app/core/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, tap } from 'rxjs';

/** ============================
 * CONFIG
 * ============================ */
const API_AUTH = 'http://localhost:3000/api/auth';
const API_CHECKOUT = 'http://localhost:3000/api/checkout';

const KEY_PROFILE = 'userProfile';
const KEY_TOKEN = 'fitpass_token';


/** ============================
 * TYPES
 * ============================ */

/** Ahora el plan puede ser cualquiera (MULTICLUB_ANUAL, ONECLUB_MENSUAL, TRIAL_3D_WEEK, etc.) */
export type MembershipType = string;

export type MembershipStatus = 'ACTIVE' | 'EXPIRED';
export type AccessStatus = 'NO_ENROLADO' | 'ACTIVO' | 'BLOQUEADO';
export type EnrollmentStatus = 'NOT_ENROLLED' | 'ENROLLED';

// Debe alinear con el backend (PeriodUnit de membership-plan.repository.ts)
export type PeriodUnit = 'WEEK' | 'MONTH' | 'TOTAL';

export interface MembershipUsage {
  isUsageLimited: boolean;
  maxDaysPerPeriod: number | null;
  periodUnit: PeriodUnit | null;
  periodLength: number | null;
  usedDaysInCurrentPeriod: number;
  remainingDaysInCurrentPeriod: number | null;
  limitReached: boolean;
  message?: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  secondLastName?: string | null;
  email: string;
  phone?: string | null;
  rut: string;
  status: 'active' | 'pending' | 'inactive';

  membershipType: MembershipType | null;
  membershipStatus: MembershipStatus | null;
  membershipStart: string | null;
  membershipEnd: string | null;

  accessStatus: AccessStatus | null;
  enrollmentStatus: EnrollmentStatus | null;

  membershipBranchId?: string | null;
  membershipBranchName?: string | null;
  membershipBranchCode?: string | null;

  /** Info de uso de membresía (trial 3 días, planes limitados, etc.) */
  membershipUsage?: MembershipUsage | null;
}

/** DTOs para el checkout de membresías */
export interface CheckoutUserDTO {
  rut: string;
  email: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  middleName?: string | null;
  phone: string;
  password: string;
}

export interface CheckoutPaymentDTO {
  amount: number;
  currency: string;
  cardLast4: string;
}

export interface CheckoutMembershipPayload {
  planCode: string;          // ej: "MULTICLUB_ANUAL" o "ONECLUB_MENSUAL"
  branchId: string | null;   // ONECLUB → id sucursal, MULTICLUB → null
  user: CheckoutUserDTO;
  payment: CheckoutPaymentDTO;
}



/** ============================
 * AUTH SERVICE
 * ============================ */
@Injectable({ providedIn: 'root' })
export class AuthService {

  private http = inject(HttpClient);

  private profileSubject = new BehaviorSubject<UserProfile | null>(loadProfile());
  readonly profile$ = this.profileSubject.asObservable();

  readonly isAuthenticated$ = this.profile$.pipe(
    map(() => !!loadToken())
  );

  /** Getter sincronizado (compat con código existente) */
  get profile(): UserProfile | null {
    return this.profileSubject.value;
  }

  get token(): string | null {
    return loadToken();
  }

  /** Flag síncrono de autenticación, usado por la nav */
  get isAuthenticated(): boolean {
    return !!loadToken();
  }

  /** Antes gestionábamos idle con sesiones; ahora el JWT no tiene "touch" real.
   *  Dejamos el método para no romper componentes existentes.
   */
  touch(): void {
    // Aquí podrías hacer un ping al backend o refrescar token más adelante si lo necesitas.
  }


  /** ============================
   * LOGIN
   * POST http://localhost:3000/api/auth/login
   * ============================ */
  login(emailOrRut: string, password: string) {
    return this.http
      .post<{ token: string; tokenType: string }>(
        `${API_AUTH}/login`,
        { emailOrRut, password }
      )
      .pipe(
        tap((resp) => {
          // 1) Guardar token
          saveToken(resp.token);

          // 2) Decodificar
          const decoded = decodeJwt(resp.token);
          if (!decoded) return;

          // 3) Mapear a UserProfile (incluyendo usage y branch)
          const profile = mapJwtToProfile(decoded);

          // 4) Persistir perfil + actualizar estado global
          saveProfile(profile);
          this.profileSubject.next(profile);
        })
      );
  }


  /** ============================
   * CHECKOUT MEMBRESÍA
   * POST http://localhost:3000/api/checkout/memberships
   * ============================ */
  checkoutMembership(payload: CheckoutMembershipPayload) {
    return this.http
      .post<{ token: string; tokenType: string }>(
        `${API_CHECKOUT}/memberships`,
        payload
      )
      .pipe(
        tap((resp) => {
          // 1) Guardar token JWT
          saveToken(resp.token);

          // 2) Decodificar JWT
          const decoded = decodeJwt(resp.token);
          if (!decoded) return;

          // 3) Mapear a UserProfile (incluyendo usage)
          const profile = mapJwtToProfile(decoded);

          // 4) Guardar perfil + actualizar estado global
          saveProfile(profile);
          this.profileSubject.next(profile);
        })
      );
  }


  /** ============================
   * LOGOUT
   * ============================ */
  logout() {
    clearToken();
    clearProfile();
    this.profileSubject.next(null);
  }


  /** ============================
   * SET PROFILE (por si necesitas ajustar algo manualmente)
   * ============================ */
  setProfile(profile: UserProfile) {
    saveProfile(profile);
    this.profileSubject.next(profile);
  }
}



/** ============================
 * HELPERS: JWT decode
 * ============================ */
function decodeJwt(token: string): any | null {
  try {
    const base64 = token.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}


/** ============================
 * MAP JWT → UserProfile
 * ============================ */
function mapJwtToProfile(payload: any): UserProfile {
  const user = payload.user ?? {};
  const membership = payload.membership ?? {};
  const usage = membership.usage ?? null;

  const statusRaw = (user.status ?? '').toString().toLowerCase();
  const statusMapped =
    statusRaw === 'activo' ? 'active' :
    statusRaw === 'pending' ? 'pending' :
    statusRaw === 'inactive' ? 'inactive' :
    'active';

  // Mapear usage del JWT a MembershipUsage fuertemente tipado
  let membershipUsage: MembershipUsage | null = null;
  if (usage) {
    membershipUsage = {
      isUsageLimited: !!usage.isUsageLimited,
      maxDaysPerPeriod: usage.maxDaysPerPeriod ?? null,
      periodUnit: usage.periodUnit ?? null,
      periodLength: usage.periodLength ?? null,
      usedDaysInCurrentPeriod: usage.usedDaysInCurrentPeriod ?? 0,
      remainingDaysInCurrentPeriod: usage.remainingDaysInCurrentPeriod ?? null,
      limitReached: !!usage.limitReached,
      message: usage.message ?? undefined,
    };
  }

  return {
    id: user.id,
    firstName: user.firstName,
    middleName: user.middleName ?? null,
    lastName: user.lastName,
    secondLastName: user.secondLastName ?? null,
    email: user.email,
    phone: user.phone ?? null,
    rut: user.rut,
    status: statusMapped,

    membershipType: membership.planCode ?? null,
    membershipStatus: membership.status ?? null,
    membershipStart: membership.startDate ?? null,
    membershipEnd: membership.endDate ?? null,

    accessStatus: user.accessStatus ?? null,
    enrollmentStatus: null,

    membershipBranchId: membership.branchId ?? null,
    membershipBranchName: membership.branchName ?? null,
    membershipBranchCode: membership.branchCode ?? null,

    membershipUsage,
  };
}


/** ============================
 * LOCAL STORAGE HELPERS
 * ============================ */
function loadToken(): string | null {
  return localStorage.getItem(KEY_TOKEN);
}

function saveToken(token: string) {
  localStorage.setItem(KEY_TOKEN, token);
}

function clearToken() {
  localStorage.removeItem(KEY_TOKEN);
}

function loadProfile(): UserProfile | null {
  const raw = localStorage.getItem(KEY_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function saveProfile(profile: UserProfile) {
  localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
}

function clearProfile() {
  localStorage.removeItem(KEY_PROFILE);
}

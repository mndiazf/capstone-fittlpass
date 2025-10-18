// src/app/core/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, tap } from 'rxjs';

const API_BASE = 'http://localhost:8080';

export type MembershipType = 'MULTICLUB_ANUAL' | 'ONECLUB_ANUAL' | 'ONECLUB_MENSUAL';
export type MembershipStatus = 'ACTIVE' | 'EXPIRED';
export type AccessStatus = 'NO_ENROLADO' | 'ACTIVO' | 'BLOQUEADO';
export type EnrollmentStatus = 'NOT_ENROLLED' | 'ENROLLED';

export type UserProfile = {
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
};

export type Session = {
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  ttlMinutes: number;
  lastActivity: number;
};

type State = {
  profile: UserProfile | null;
  session: Session | null;
};

export type RegisterPayload = {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  secondLastName?: string | null;
  email: string;
  phone?: string | null;
  rut: string;
  password: string;
  membershipType: MembershipType;
  status?: 'active' | 'pending' | 'inactive';
  /** SOLO camelCase; NO existe branch_id aquí */
  branchId?: string;
};

const KEY_PROFILE = 'userProfile';
const KEY_SESSION = 'fitpass_session';
const IDLE_TIMEOUT_MINUTES = 30;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private state$ = new BehaviorSubject<State>({
    profile: loadProfile(),
    session: loadSession(),
  });

  readonly profile$ = this.state$.pipe(map((s) => s.profile));
  readonly isAuthenticated$ = this.state$.pipe(map((s) => this.isSessionValid(s.session)));

  private static mapAuthResponse(resp: {
    profile: UserProfile;
    session: { sessionId: string; issuedAt: number; expiresAt: number; ttlMinutes: number };
  }): State {
    const now = Date.now();
    const session: Session = { ...resp.session, lastActivity: now };
    return { profile: resp.profile, session };
  }

  /** ===== REGISTER ===== */
  register(payload: RegisterPayload) {
    // Enviamos exactamente lo recibido (type-safe, sin branch_id)
    return this.http
      .post<{ profile: UserProfile; session: { sessionId: string; issuedAt: number; expiresAt: number; ttlMinutes: number } }>(
        `${API_BASE}/api/auth/register`,
        payload
      )
      .pipe(
        map(AuthService.mapAuthResponse),
        tap((s) => {
          saveProfile(s.profile!);
          saveSession(s.session!);
          this.state$.next(s);
        })
      );
  }

  /** ===== LOGIN ===== */
  login(email: string, password: string) {
    return this.http
      .post<{ profile: UserProfile; session: { sessionId: string; issuedAt: number; expiresAt: number; ttlMinutes: number } }>(
        `${API_BASE}/api/auth/login`,
        { email, password }
      )
      .pipe(
        map(AuthService.mapAuthResponse),
        tap((s) => {
          saveProfile(s.profile!);
          saveSession(s.session!);
          this.state$.next(s);
        })
      );
  }

  /** ===== LOGOUT ===== */
  logout(): void {
    localStorage.removeItem(KEY_SESSION);
    const { profile } = this.state$.value;
    this.state$.next({ profile, session: null });
  }

  /** ===== TOUCH (idle) ===== */
  touch(): void {
    const { session, profile } = this.state$.value;
    if (!this.isSessionValid(session)) {
      this.logout();
      return;
    }
    const updated = { ...session!, lastActivity: Date.now() };
    saveSession(updated);
    this.state$.next({ profile, session: updated });
  }

  // ===== getters =====
  get profile(): UserProfile | null { return this.state$.value.profile; }
  get session(): Session | null { return this.state$.value.session; }
  get isAuthenticated(): boolean { return this.isSessionValid(this.session); }

  // ===== utils =====
  private isSessionValid(s: Session | null): boolean {
    if (!s) return false;
    const now = Date.now();
    const hardExpire = now < s.expiresAt;
    const idleOk = now - s.lastActivity <= IDLE_TIMEOUT_MINUTES * 60 * 1000;
    return hardExpire && idleOk;
  }

  setProfile(profile: UserProfile): void {
    saveProfile(profile);
    const { session } = this.state$.value;
    this.state$.next({ profile, session });
  }
}

// ===== Helpers de storage =====
function loadProfile(): UserProfile | null {
  const raw = localStorage.getItem(KEY_PROFILE);
  if (!raw) return null;
  try { return JSON.parse(raw) as UserProfile; } catch { return null; }
}

function saveProfile(p: UserProfile): void {
  localStorage.setItem(KEY_PROFILE, JSON.stringify(p));
}

function loadSession(): Session | null {
  const raw = localStorage.getItem(KEY_SESSION);
  if (!raw) return null;
  try { return JSON.parse(raw) as Session; } catch { return null; }
}

function saveSession(s: Session): void {
  localStorage.setItem(KEY_SESSION, JSON.stringify(s));
}

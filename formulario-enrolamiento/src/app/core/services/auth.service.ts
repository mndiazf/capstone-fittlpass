// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export type UserProfile = {
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  email: string;
  phone: string;
  rut: string;
  membership?: string;
  membershipId?: string;
  membershipPrice?: string;
  membershipDiscount?: string;
  membershipFeatures?: string[];
  joinDate?: string;    // ISO
  nextPayment?: string; // ISO
  status?: 'active' | 'pending' | 'inactive';
};

export type Session = {
  sessionId: string;
  issuedAt: number;      // epoch ms
  expiresAt: number;     // epoch ms (TTL absoluto)
  lastActivity: number;  // epoch ms (para timeout por inactividad)
};

type State = {
  profile: UserProfile | null;
  session: Session | null;
};

const KEY_PROFILE = 'userProfile';
const KEY_SESSION = 'fitpass_session';

// Config sesión
const SESSION_TTL_MINUTES  = 120; // dura 2 horas desde creación
const IDLE_TIMEOUT_MINUTES = 30;  // vence si pasan 30 min sin actividad

@Injectable({ providedIn: 'root' })
export class AuthService {
  private state$ = new BehaviorSubject<State>({
    profile: loadProfile(),
    session: loadSession(),
  });

  // Observables
  readonly profile$ = this.state$.pipe(map(s => s.profile));
  readonly isAuthenticated$ = this.state$.pipe(
    map(s => this.isSessionValid(s.session))
  );

  // ========== Sesión ==========
  loginWithCredentials(email: string, password: string): boolean {
    // DEMO: válido si no están vacíos
    if (!email || !password) return false;

    // Si no hay profile, crea uno básico (puedes reemplazar con lo real del backend)
    const current = this.state$.value.profile ?? {
      firstName: 'Usuario',
      lastName: '',
      email,
      phone: '',
      rut: '',
      status: 'active' as const,
    };

    saveProfile(current);
    const session = createNewSession();
    saveSession(session);

    this.state$.next({ profile: current, session });
    return true;
  }

  loginWithProfile(profile: UserProfile): void {
    // Usado por el checkout al registrar/pagar
    saveProfile(profile);
    const session = createNewSession();
    saveSession(session);
    this.state$.next({ profile, session });
  }

  logout(): void {
    // Cierra SOLO la sesión (perfil permanece)
    localStorage.removeItem(KEY_SESSION);
    const { profile } = this.state$.value;
    this.state$.next({ profile, session: null });
  }

  touch(): void {
    // Refresca lastActivity si la sesión sigue válida
    const { session, profile } = this.state$.value;
    if (!this.isSessionValid(session)) {
      // Si ya no es válida, bórrala
      this.logout();
      return;
    }
    const updated = { ...session!, lastActivity: Date.now() };
    saveSession(updated);
    this.state$.next({ profile, session: updated });
  }

  // ========== Perfil ==========
  get profile(): UserProfile | null { return this.state$.value.profile; }
  setProfile(profile: UserProfile): void {
    saveProfile(profile);
    const { session } = this.state$.value;
    this.state$.next({ profile, session });
  }

  // ========== Lecturas directas ==========
  get session(): Session | null { return this.state$.value.session; }
  get isAuthenticated(): boolean { return this.isSessionValid(this.session); }

  // ========== Utilidades internas ==========
  private isSessionValid(s: Session | null): boolean {
    if (!s) return false;
    const now = Date.now();
    const hardExpire = now < s.expiresAt;
    const idleOk = now - s.lastActivity <= IDLE_TIMEOUT_MINUTES * 60 * 1000;
    return hardExpire && idleOk;
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

function createNewSession(): Session {
  const now = Date.now();
  const ttl = SESSION_TTL_MINUTES * 60 * 1000;
  return {
    sessionId: 'sess-' + cryptoRandom(),
    issuedAt: now,
    lastActivity: now,
    expiresAt: now + ttl,
  };
}

function cryptoRandom(): string {
  // id simple (puedes cambiar por UUID)
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

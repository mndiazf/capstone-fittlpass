import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export type SessionUser = { id: number; name: string; email: string };
type State = { token: string | null; user: SessionUser | null };

const KEY = 'fitpass_token';
const KEY_USER = 'fitpass_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private state$ = new BehaviorSubject<State>({
    token: localStorage.getItem(KEY),
    user: (() => {
      const raw = localStorage.getItem(KEY_USER);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    })(),
  });

  readonly isAuthenticated$ = this.state$.pipe(map(s => !!s.token));
  readonly user$            = this.state$.pipe(map(s => s.user));

  /** DEMO: acepta cualquier email/clave no vacíos */
  loginDemo(email: string, password: string): boolean {
    if (!email || !password) return false;
    const token = 'demo-' + Date.now();
    const user: SessionUser = { id: 1, name: 'Demo User', email };
    localStorage.setItem(KEY, token);
    localStorage.setItem(KEY_USER, JSON.stringify(user));
    this.state$.next({ token, user });
    return true;
  }

  logout() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY_USER);
    this.state$.next({ token: null, user: null });
  }

  get token() { return this.state$.value.token; }
  get user()  { return this.state$.value.user; }
}

// src/app/core/services/auth.service.ts
// ✨ CORRECCIÓN: getCurrentUserBranchId ahora retorna number | null

import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, fromEvent, merge, Subject, of } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { StaffService, StaffMember } from './staff.service';

export interface User {
  email: string;
  name: string;
  token: string;
  loginTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // ==========================================
  // INYECCIÓN DE DEPENDENCIAS
  // ==========================================
  private staffService = inject(StaffService);

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  // ==========================================
  // GESTIÓN DE SESIÓN
  // ==========================================
  private destroy$ = new Subject<void>();
  private inactivityTimer: any;
  private sessionTimer: any;
  private warningTimer: any;

  // Configuración (AJUSTA ESTOS VALORES)
  private readonly INACTIVITY_MINUTES = 15;  // Tiempo de inactividad
  private readonly SESSION_DURATION_MINUTES = 480; // 8 horas máximo
  private readonly WARNING_MINUTES = 2; // Advertencia antes de expirar

  // Observables para el estado
  public sessionWarning$ = new BehaviorSubject<boolean>(false);
  public remainingTime$ = new BehaviorSubject<number>(this.WARNING_MINUTES);

  constructor(
    private router: Router,
    private ngZone: NgZone
  ) {
    const storedUser = localStorage.getItem('gym_user');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  // ==========================================
  // MÉTODOS DE AUTENTICACIÓN
  // ==========================================

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    const token = localStorage.getItem('gym_token');
    if (!token) return false;
    return this.isSessionValid();
  }

  login(email: string, password: string): Observable<User> {
    return new Observable(observer => {
      setTimeout(() => {
        // Validación simple - acepta cualquier email válido
        if (email && password && email.includes('@') && password.length >= 6) {
          const user: User = {
            email: email,
            name: email.split('@')[0],
            token: this.generateToken(),
            loginTime: new Date().toISOString()
          };

          // Guardar en localStorage
          localStorage.setItem('gym_user', JSON.stringify(user));
          localStorage.setItem('gym_token', user.token);
          localStorage.setItem('session_start_time', new Date().toISOString());

          this.currentUserSubject.next(user);

          // Iniciar monitoreo de sesión
          this.startSessionMonitoring();

          observer.next(user);
          observer.complete();
        } else {
          observer.error({ message: 'Email o contraseña inválidos' });
        }
      }, 1000);
    });
  }

  logout(reason?: string): void {
    this.stopSessionMonitoring();
    
    localStorage.removeItem('gym_user');
    localStorage.removeItem('gym_token');
    localStorage.removeItem('session_start_time');
    
    this.currentUserSubject.next(null);
    
    const queryParams = reason ? { reason } : {};
    this.router.navigate(['/auth/login'], { queryParams });
  }

  private generateToken(): string {
    return 'token_' + Math.random().toString(36).substr(2, 9) + Date.now();
  }

  getUserData(): User | null {
    const userData = localStorage.getItem('gym_user');
    return userData ? JSON.parse(userData) : null;
  }

  // ==========================================
  // CONTEXTO DE SUCURSAL
  // ==========================================

  /**
   * Obtiene los datos completos del staff member logueado
   */
  getCurrentStaffMember(): Observable<StaffMember | null> {
    const currentUser = this.currentUserValue;
    
    if (!currentUser || !currentUser.email) {
      return of(null);
    }

    return this.staffService.getByEmail(currentUser.email);
  }

  /**
   * ✅ CORREGIDO: Obtiene el ID de sucursal del usuario logueado como NUMBER
   */
  getCurrentUserBranchId(): number | null {
    const currentUser = this.currentUserValue;
    if (!currentUser) return null;

    // MOCK: mapear email a branchId
    // En producción esto vendría del token JWT o una llamada al backend
    const mockStaffData: { [email: string]: number } = {
      'juan.perez@gymhealth.com': 1,
      'maria.lopez@gymhealth.com': 2,
      'pedro.ramirez@gymhealth.com': 1,
      // Usuarios de prueba adicionales
      'admin1@gymhealth.com': 1,
      'admin2@gymhealth.com': 2,
      'admin3@gymhealth.com': 3,
    };

    return mockStaffData[currentUser.email] || 1; // Default: sucursal 1
  }

  /**
   * Verifica si el usuario actual es super admin
   */
  isSuperAdmin(): boolean {
    const currentUser = this.currentUserValue;
    if (!currentUser) return false;

    // MOCK: solo emails específicos son super admin
    // En producción esto vendría del token JWT o perfil del usuario
    const superAdminEmails = [
      'admin@gymhealth.com',
      'superadmin@gymhealth.com'
    ];

    return superAdminEmails.includes(currentUser.email);
  }

  /**
   * Obtiene el nombre completo del usuario para auditoría
   */
  getCurrentUserFullName(): string {
    const currentUser = this.currentUserValue;
    if (!currentUser) return 'Usuario Desconocido';
    
    // MOCK: mapear email a nombre completo
    const mockStaffNames: { [email: string]: string } = {
      'juan.perez@gymhealth.com': 'Juan Pérez González',
      'maria.lopez@gymhealth.com': 'María López Silva',
      'pedro.ramirez@gymhealth.com': 'Pedro Ramírez Fernández',
      'admin1@gymhealth.com': 'Admin Las Condes',
      'admin2@gymhealth.com': 'Admin Providencia',
      'admin3@gymhealth.com': 'Admin Viña del Mar',
      'admin@gymhealth.com': 'Super Admin',
      'superadmin@gymhealth.com': 'Super Admin',
    };

    return mockStaffNames[currentUser.email] || currentUser.name;
  }

  // ==========================================
  // GESTIÓN DE SESIÓN
  // ==========================================

  /**
   * Inicia el monitoreo de actividad del usuario
   */
  private startSessionMonitoring(): void {
    this.ngZone.runOutsideAngular(() => {
      // Detectar actividad del usuario
      const userActivity$ = merge(
        fromEvent(document, 'click'),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'scroll'),
        fromEvent(document, 'touchstart')
      ).pipe(
        debounceTime(1000),
        takeUntil(this.destroy$)
      );

      userActivity$.subscribe(() => {
        this.resetInactivityTimer();
      });
    });

    this.resetInactivityTimer();
    this.startMaxSessionTimer();
  }

  /**
   * Reinicia el timer de inactividad
   */
  private resetInactivityTimer(): void {
    this.clearTimers();
    this.sessionWarning$.next(false);

    this.ngZone.runOutsideAngular(() => {
      const timeoutMs = this.INACTIVITY_MINUTES * 60 * 1000;
      const warningMs = (this.INACTIVITY_MINUTES - this.WARNING_MINUTES) * 60 * 1000;

      // Timer de advertencia
      if (warningMs > 0) {
        this.warningTimer = setTimeout(() => {
          this.ngZone.run(() => {
            this.sessionWarning$.next(true);
            this.startCountdown();
          });
        }, warningMs);
      }

      // Timer de expiración
      this.inactivityTimer = setTimeout(() => {
        this.ngZone.run(() => {
          this.logout('inactivity');
        });
      }, timeoutMs);
    });
  }

  /**
   * Timer de duración máxima de sesión
   */
  private startMaxSessionTimer(): void {
    const sessionMs = this.SESSION_DURATION_MINUTES * 60 * 1000;
    
    this.sessionTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.logout('session_expired');
      });
    }, sessionMs);
  }

  /**
   * Cuenta regresiva para el modal
   */
  private startCountdown(): void {
    let remainingSeconds = this.WARNING_MINUTES * 60;
    
    const countdownInterval = setInterval(() => {
      if (remainingSeconds > 0 && this.sessionWarning$.value) {
        remainingSeconds--;
        this.remainingTime$.next(Math.ceil(remainingSeconds / 60));
      } else {
        clearInterval(countdownInterval);
      }
    }, 1000);
  }

  /**
   * Extiende la sesión cuando el usuario interactúa
   */
  extendSession(): void {
    this.sessionWarning$.next(false);
    this.resetInactivityTimer();
  }

  /**
   * Verifica si la sesión es válida
   */
  isSessionValid(): boolean {
    const sessionStartTime = localStorage.getItem('session_start_time');
    if (!sessionStartTime) return false;

    const startTime = new Date(sessionStartTime);
    const now = new Date();
    const elapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);

    return elapsedMinutes < this.SESSION_DURATION_MINUTES;
  }

  /**
   * Detiene el monitoreo
   */
  stopSessionMonitoring(): void {
    this.clearTimers();
    this.destroy$.next();
    this.sessionWarning$.next(false);
  }

  /**
   * Limpia todos los timers
   */
  private clearTimers(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  /**
   * Obtiene el tiempo restante de sesión en minutos
   */
  getRemainingSessionTime(): number {
    const sessionStartTime = localStorage.getItem('session_start_time');
    if (!sessionStartTime) return 0;

    const startTime = new Date(sessionStartTime);
    const now = new Date();
    const elapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
    
    return Math.max(0, this.SESSION_DURATION_MINUTES - elapsedMinutes);
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  AuthService,
  UserProfile,
  MembershipStatus,
  AccessStatus
} from '../../core/services/auth.service';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rut: string;

  /** Campos usados por la UI */
  membership: string;          // nombre legible del plan (planName del JWT o label mapeado)
  membershipType: string;      // planCode del backend
  membershipBranchName?: string | null;
  membershipStatus?: MembershipStatus | null;

  membershipPrice: string;     // monto del plan actual (formateado CLP)
  joinDate: Date;              // membershipStart / startDate
  nextPayment: Date;           // fecha del próximo cobro
  nextPaymentAmount: string;   // monto del próximo cobro (trial => $29.000)
  isTrial: boolean;            // true si es la membresía de prueba

  status: 'active' | 'pending' | 'inactive';
  accessStatus: AccessStatus | null;

  // Datos del último pago (desde el JWT)
  cardLast4?: string | null;
  cardBrand?: string | null;
  lastPaymentAt?: Date | null;
}

interface AccessRecord {
  date: Date;
  time: string;
  location: string;
  type: 'entry' | 'exit';
}

const TRIAL_MONTHLY_AMOUNT = 29000; // $29.000 para el plan mensual post-trial

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  showWelcomeModal = false;
  userData: UserData | null = null;
  recentAccess: AccessRecord[] = [];

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit() {
    // Modal de bienvenida solo la primera vez (flag que tú seteas al redirigir)
    const firstLogin = localStorage.getItem('userFirstLogin');
    if (firstLogin === 'true') {
      this.showWelcomeModal = true;
      localStorage.removeItem('userFirstLogin');
    }

    this.loadUserData();
    this.loadRecentAccess();
  }

  /** TRUE si el plan es ONECLUB_* */
  get isOneClub(): boolean {
    return (this.userData?.membershipType || '').startsWith('ONECLUB');
  }

  /** Carga el perfil a partir del AuthService + JWT */
  private loadUserData() {
    const profile = this.auth.profile;
    const token = this.auth.token;
    const payload = token ? decodeJwt(token) : null;

    if (profile) {
      this.userData = this.buildUserData(profile, payload);
      return;
    }

    // Fallback ultra defensivo si no hay perfil (modo demo antiguo)
    const userName = localStorage.getItem('userName') || 'Usuario';
    const userMembership = localStorage.getItem('userMembership') || 'Plan Básico';
    const [firstName, ...lnParts] = userName.split(' ');
    const lastName = lnParts.join(' ');

    const membershipPrice = this.getMembershipPrice(userMembership);
    const joinDate = new Date();
    const nextPayment = this.calculateNextPayment(joinDate);

    this.userData = {
      firstName,
      lastName,
      email: 'usuario@email.com',
      phone: '+56 9 1234 5678',
      rut: '12.345.678-9',

      membership: userMembership,
      membershipType: 'BASIC',
      membershipBranchName: null,
      membershipStatus: 'ACTIVE',

      membershipPrice,
      joinDate,
      nextPayment,
      nextPaymentAmount: membershipPrice,
      isTrial: false,

      status: 'active',
      accessStatus: 'NO_ENROLADO',
      cardLast4: null,
      cardBrand: null,
      lastPaymentAt: null
    };
  }

  /** Construye el UserData real usando profile + payload completo del JWT */
  private buildUserData(profile: UserProfile, payload: any | null): UserData {
    const lastName = [profile.lastName, profile.secondLastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const membership = payload?.membership ?? {};
    const payment    = payload?.payment ?? {};

    // planCode desde profile o desde el payload
    const planCode: string = profile.membershipType ?? membership.planCode ?? 'BASIC';

    // Nombre del plan: primero planName del backend, luego mapeo por código, luego fallback
    const planName: string =
      membership.planName ??
      this.membershipTypeToLabel(planCode) ??
      'Plan Básico';

    // ¿Es el plan de prueba?
    const isTrial = this.isTrialPlan(planCode, planName, payment);

    // Estado de membresía
    const membershipStatus: MembershipStatus | null =
      (profile.membershipStatus ?? membership.status ?? null) as MembershipStatus | null;

    // Fechas: inicio y fin de plan
    const joinDate: Date =
      profile.membershipStart
        ? new Date(profile.membershipStart)
        : membership.startDate
          ? new Date(membership.startDate)
          : new Date();

    const endDateStr: string | null =
      profile.membershipEnd ??
      membership.endDate ??
      null;

    // Próximo pago:
    let nextPayment: Date;

    if (isTrial) {
      // Trial: próximo pago = 7 días desde el inicio
      nextPayment = this.addDays(joinDate, 7);
    } else if (endDateStr) {
      // Si hay fecha de fin de plan => la tomamos como próximo pago (renovación)
      nextPayment = new Date(endDateStr);
    } else if (payment.paidAt) {
      // Si hay paidAt => calculamos +1 mes desde el pago
      nextPayment = this.calculateNextPayment(new Date(payment.paidAt));
    } else {
      // Si no, +1 mes desde la fecha de inicio
      nextPayment = this.calculateNextPayment(joinDate);
    }

    // Monto del plan actual y del próximo pago
    let membershipPrice: string;
    let nextPaymentAmount: string;

    if (isTrial) {
      // Trial => plan actual $0, próximo pago $29.000
      membershipPrice   = this.formatCLP(0);
      nextPaymentAmount = this.formatCLP(TRIAL_MONTHLY_AMOUNT);
    } else if (payment.amount) {
      const amountNumber = Number(payment.amount);
      membershipPrice   = this.formatCLP(amountNumber);
      nextPaymentAmount = membershipPrice;
    } else {
      const fallbackPrice = this.getMembershipPrice(planName);
      membershipPrice   = fallbackPrice;
      nextPaymentAmount = fallbackPrice;
    }

    const statusMapped: UserData['status'] =
      profile.status || 'active'; // ya viene normalizado: 'active' | 'pending' | 'inactive'

    return {
      firstName: profile.firstName || 'Usuario',
      lastName:  lastName || '',
      email:     profile.email || 'usuario@email.com',
      phone:     profile.phone ?? '+56 9 1234 5678',
      rut:       profile.rut || '12.345.678-9',

      membership:           planName,
      membershipType:       planCode,
      membershipBranchName: profile.membershipBranchName ?? null,
      membershipStatus,

      membershipPrice,
      joinDate,
      nextPayment,
      nextPaymentAmount,
      isTrial,

      status: statusMapped,
      accessStatus: profile.accessStatus ?? null,

      cardLast4: payment.cardLast4 ?? null,
      cardBrand: payment.cardBrand ?? null,
      lastPaymentAt: payment.paidAt ? new Date(payment.paidAt) : null
    };
  }

  /** Detecta si el plan es el trial de 0 CLP */
  private isTrialPlan(planCode: string, planName: string, payment: any): boolean {
    const code = (planCode || '').toUpperCase();
    const name = (planName || '').toLowerCase();

    // Puedes adaptar estos códigos / nombres a cómo lo definas en el backend
    if (code.includes('TRIAL') || code.includes('PRUEBA')) return true;
    if (name.includes('trial') || name.includes('prueba')) return true;

    // Si el pago viene explícitamente con monto 0, también lo tomamos como trial
    if (payment && payment.amount && Number(payment.amount) === 0) return true;

    return false;
  }

  /** Mapea membershipType (planCode) a texto legible si no tenemos planName */
  private membershipTypeToLabel(type?: string | null): string {
    switch (type) {
      case 'MULTICLUB_ANUAL': return 'Multiclub Anual';
      case 'ONECLUB_ANUAL':   return 'Plan Anual OneClub';
      case 'ONECLUB_MENSUAL': return 'Plan Mensual Cargo Automático';
      default:                return 'Plan Básico';
    }
  }

  /** Precio fallback por nombre de plan (solo si no tenemos payment.amount) */
  private getMembershipPrice(label: string): string {
    const prices: Record<string, string> = {
      'Multiclub Anual':                '$239.000',
      'Plan Anual OneClub':             '$220.000',
      'Plan Mensual Cargo Automático':  '$21.000',
      'Plan Básico':                    '$0'
    };
    return prices[label] ?? '$0';
  }

  /** Calcula el próximo pago como +1 mes desde la fecha base */
  private calculateNextPayment(from = new Date()): Date {
    const next = new Date(from);
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  /** Suma días a una fecha */
  private addDays(from: Date, days: number): Date {
    const d = new Date(from);
    d.setDate(d.getDate() + days);
    return d;
  }

  private formatCLP(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  loadRecentAccess() {
    // Placeholder para cuando tengas historial real de accesos
    this.recentAccess = [];
  }

  closeWelcomeModal() {
    this.showWelcomeModal = false;
  }

  formatDate(date: Date | undefined | null): string {
    if (!date) return '—';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  getDaysUntilPayment(): number {
    if (!this.userData) return 0;
    const today = new Date();
    const next = this.userData.nextPayment instanceof Date
      ? this.userData.nextPayment
      : new Date(this.userData.nextPayment);
    const diff = next.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

/** Helper local para decodificar el JWT desde el dashboard */
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

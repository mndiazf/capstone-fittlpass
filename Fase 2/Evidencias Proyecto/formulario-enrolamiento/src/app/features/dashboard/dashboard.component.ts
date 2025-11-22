// src/app/features/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  AuthService,
  UserProfile,
  MembershipStatus,
  AccessStatus,
  MembershipUsage,
} from '../../core/services/auth.service';
import { Member, MemberAccessItem } from '../../core/services/member';


interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rut: string;

  /** Campos usados por la UI */
  membership: string;
  membershipType: string;
  membershipBranchName?: string | null;
  membershipStatus?: MembershipStatus | null;

  membershipPrice: string;
  joinDate: Date;
  nextPayment: Date;
  nextPaymentAmount: string;
  isTrial: boolean;

  status: 'active' | 'pending' | 'inactive';
  accessStatus: AccessStatus | null;

  cardLast4?: string | null;
  cardBrand?: string | null;
  lastPaymentAt?: Date | null;

  membershipUsage?: MembershipUsage | null;
  trialUsageMessage?: string | null;
}

interface AccessRecord {
  date: Date;
  time: string;
  location: string;
  type: 'entry' | 'exit';
  result: 'GRANTED' | 'DENIED' | string; // 👈 ahora incluye estado del backend
}

const TRIAL_MONTHLY_AMOUNT = 29000;

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  showWelcomeModal = false;
  userData: UserData | null = null;
  recentAccess: AccessRecord[] = [];

  constructor(
    private router: Router,
    private auth: AuthService,
    private memberService: Member,
  ) {}

  ngOnInit() {
    const firstLogin = localStorage.getItem('userFirstLogin');
    if (firstLogin === 'true') {
      this.showWelcomeModal = true;
      localStorage.removeItem('userFirstLogin');
    }

    this.loadUserData();
    this.loadRecentAccess();
  }

  get isOneClub(): boolean {
    return (this.userData?.membershipType || '').startsWith('ONECLUB');
  }

  private loadUserData() {
    const profile = this.auth.profile;
    const token = this.auth.token;
    const payload = token ? decodeJwt(token) : null;

    if (profile) {
      this.userData = this.buildUserData(profile, payload);
      return;
    }

    const userName = localStorage.getItem('userName') || 'Usuario';
    const userMembership =
      localStorage.getItem('userMembership') || 'Plan Básico';
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
      lastPaymentAt: null,
      membershipUsage: null,
      trialUsageMessage: null,
    };
  }

  private buildUserData(profile: UserProfile, payload: any | null): UserData {
    const lastName = [profile.lastName, profile.secondLastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const membership = payload?.membership ?? {};
    const payment = payload?.payment ?? {};
    const usage: MembershipUsage | null = membership.usage ?? null;

    const planCode: string =
      profile.membershipType ?? membership.planCode ?? 'BASIC';

    const planName: string =
      membership.planName ??
      this.membershipTypeToLabel(planCode) ??
      'Plan Básico';

    const isTrial = this.isTrialPlan(planCode, planName, payment);

    const membershipStatus: MembershipStatus | null =
      (profile.membershipStatus ??
        membership.status ??
        null) as MembershipStatus | null;

    const joinDate: Date =
      profile.membershipStart
        ? new Date(profile.membershipStart)
        : membership.startDate
          ? new Date(membership.startDate)
          : new Date();

    const endDateStr: string | null =
      profile.membershipEnd ?? membership.endDate ?? null;

    let nextPayment: Date;

    if (isTrial) {
      nextPayment = this.addDays(joinDate, 7);
    } else if (endDateStr) {
      nextPayment = new Date(endDateStr);
    } else if (payment.paidAt) {
      nextPayment = this.calculateNextPayment(new Date(payment.paidAt));
    } else {
      nextPayment = this.calculateNextPayment(joinDate);
    }

    let membershipPrice: string;
    let nextPaymentAmount: string;

    if (isTrial) {
      membershipPrice = this.formatCLP(0);
      nextPaymentAmount = this.formatCLP(TRIAL_MONTHLY_AMOUNT);
    } else if (payment.amount) {
      const amountNumber = Number(payment.amount);
      membershipPrice = this.formatCLP(amountNumber);
      nextPaymentAmount = membershipPrice;
    } else {
      const fallbackPrice = this.getMembershipPrice(planName);
      membershipPrice = fallbackPrice;
      nextPaymentAmount = fallbackPrice;
    }

    const statusMapped: UserData['status'] = profile.status || 'active';

    let trialUsageMessage: string | null = null;
    if (isTrial && usage) {
      if (usage.limitReached) {
        trialUsageMessage =
          usage.message ||
          'Ya utilizaste todos los días de tu periodo de prueba.';
      } else {
        const used = usage.usedDaysInCurrentPeriod ?? 0;
        const max = usage.maxDaysPerPeriod ?? 3;
        const remaining =
          usage.remainingDaysInCurrentPeriod ??
          Math.max(0, max - used);

        trialUsageMessage = `Has usado ${used} de ${max} días de tu prueba. Te quedan ${remaining} días.`;
      }
    }

    return {
      firstName: profile.firstName || 'Usuario',
      lastName: lastName || '',
      email: profile.email || 'usuario@email.com',
      phone: profile.phone ?? '+56 9 1234 5678',
      rut: profile.rut || '12.345.678-9',

      membership: planName,
      membershipType: planCode,
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
      lastPaymentAt: payment.paidAt ? new Date(payment.paidAt) : null,

      membershipUsage: usage,
      trialUsageMessage,
    };
  }

  private isTrialPlan(
    planCode: string,
    planName: string,
    payment: any,
  ): boolean {
    const code = (planCode || '').toUpperCase();
    const name = (planName || '').toLowerCase();

    if (code.includes('TRIAL') || code.includes('PRUEBA')) return true;
    if (name.includes('trial') || name.includes('prueba')) return true;

    if (payment && payment.amount && Number(payment.amount) === 0) {
      return true;
    }

    return false;
  }

  private membershipTypeToLabel(type?: string | null): string {
    switch (type) {
      case 'MULTICLUB_ANUAL':
        return 'Multiclub Anual';
      case 'ONECLUB_ANUAL':
        return 'Plan Anual OneClub';
      case 'ONECLUB_MENSUAL':
        return 'Plan Mensual Cargo Automático';
      default:
        return 'Plan Básico';
    }
  }

  private getMembershipPrice(label: string): string {
    const prices: Record<string, string> = {
      'Multiclub Anual': 'CLP 239.000',
      'Plan Anual OneClub': 'CLP 220.000',
      'Plan Mensual Cargo Automático': 'CLP 21.000',
      'Plan Básico': 'CLP 0',
    };
    return prices[label] ?? 'CLP 0';
  }

  private calculateNextPayment(from = new Date()): Date {
    const next = new Date(from);
    next.setMonth(next.getMonth() + 1);
    return next;
  }

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

  /** ============================
   * ACCESOS RECIENTES (última semana)
   * ============================ */
  private loadRecentAccess() {
    const profile = this.auth.profile;
    if (!profile) {
      this.recentAccess = [];
      return;
    }

    this.memberService.getLastWeekAccesses(profile.id).subscribe({
      next: (items: MemberAccessItem[]) => {
        this.recentAccess = items.map((item) => {
          const dateObj = new Date(item.createdAt);
          const time = dateObj.toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return {
            date: dateObj,
            time,
            location: item.branchName || 'Sucursal desconocida',
            type: 'entry', // de momento solo registramos entradas
            result: item.result as 'GRANTED' | 'DENIED' | string, // 👈 aquí traemos el status real
          };
        });
      },
      error: () => {
        this.recentAccess = [];
      },
    });
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
      year: 'numeric',
    });
  }

  getDaysUntilPayment(): number {
    if (!this.userData) return 0;
    const today = new Date();
    const next =
      this.userData.nextPayment instanceof Date
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

function decodeJwt(token: string): any | null {
  try {
    const base64 = token
      .split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join(''),
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

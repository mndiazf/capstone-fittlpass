import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rut: string;

  /** Campos usados por la UI */
  membership: string;          // label legible del plan
  membershipType: 'MULTICLUB_ANUAL' | 'ONECLUB_ANUAL' | 'ONECLUB_MENSUAL' | 'BASIC' | string;
  membershipBranchName?: string | null; // sucursal (ONECLUB)
  membershipStatus?: 'ACTIVE' | 'EXPIRED' | null;

  membershipPrice: string;     // precio mostrado
  joinDate: Date;              // membershipStart (backend)
  nextPayment: Date;           // membershipEnd o cálculo

  status: 'active' | 'pending' | 'inactive';
}

interface AccessRecord {
  date: Date;
  time: string;
  location: string;
  type: 'entry' | 'exit';
}

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

  constructor(private router: Router) {}

  ngOnInit() {
    // Modal de bienvenida solo la primera vez
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

  /** Mapea membershipType (backend) a texto para UI */
  private membershipTypeToLabel(type?: string | null): string {
    switch (type) {
      case 'MULTICLUB_ANUAL': return 'Plan Anual MultiClub';
      case 'ONECLUB_ANUAL':   return 'Plan Anual OneClub';
      case 'ONECLUB_MENSUAL': return 'Plan Mensual Cargo Automático';
      default:                return 'Plan Básico';
    }
  }

  /** Precio mostrado según label (compatibilidad con tu HTML) */
  private getMembershipPrice(label: string): string {
    const prices: Record<string, string> = {
      'Plan Anual MultiClub':            '$14.667',
      'Plan Anual OneClub':              '$14.000',
      'Plan Mensual Cargo Automático':   '$21.000',
      'Plan Básico':                     '$0'
    };
    return prices[label] ?? '$0';
  }

  /** Siguiente pago por defecto = +1 mes desde hoy (fallback) */
  private calculateNextPayment(from = new Date()): Date {
    const next = new Date(from);
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  /** Carga el perfil real desde localStorage ('userProfile') guardado por AuthService */
  loadUserData() {
    const raw = localStorage.getItem('userProfile');

    if (raw) {
      try {
        const p = JSON.parse(raw);

        // Unir apellidos si vienen separados
        const lastName = [p.lastName, p.secondLastName].filter(Boolean).join(' ').trim();

        // Derivar label y fechas
        const membershipLabel = this.membershipTypeToLabel(p.membershipType);
        const joinDate  = p.membershipStart ? new Date(p.membershipStart) : new Date();
        const nextPay   = p.membershipEnd   ? new Date(p.membershipEnd)   : this.calculateNextPayment();

        this.userData = {
          firstName: p.firstName || 'Usuario',
          lastName: lastName || '',
          email: p.email || 'usuario@email.com',
          phone: p.phone || '+56 9 1234 5678',
          rut: p.rut || '12.345.678-9',

          membership: membershipLabel,
          membershipType: p.membershipType || 'BASIC',
          membershipBranchName: p.membershipBranchName || null,
          membershipStatus: p.membershipStatus || null,

          membershipPrice: this.getMembershipPrice(membershipLabel),
          joinDate,
          nextPayment: nextPay,
          status: (p.status as UserData['status']) || 'active'
        };
        return;
      } catch {
        // continúa al fallback
      }
    }

    // Fallback si no hubo perfil o falló el parseo
    const userName = localStorage.getItem('userName') || 'Usuario';
    const userMembership = localStorage.getItem('userMembership') || 'Plan Básico';
    const [firstName, ...lnParts] = userName.split(' ');
    const lastName = lnParts.join(' ');

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

      membershipPrice: this.getMembershipPrice(userMembership),
      joinDate: new Date(),
      nextPayment: this.calculateNextPayment(),
      status: 'active'
    };
  }

  loadRecentAccess() {
    // Datos simulados de accesos recientes
    this.recentAccess = [

    ];
  }

  closeWelcomeModal() {
    this.showWelcomeModal = false;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-CL', {
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
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}

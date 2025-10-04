import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rut: string;
  membership: string;
  membershipPrice: string;
  joinDate: Date;
  nextPayment: Date;
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

  /** Carga el perfil real desde localStorage ('userProfile') guardado en el checkout.
   *  Si no existe o hay error, cae a un fallback con datos mínimos. */
  loadUserData() {
    const raw = localStorage.getItem('userProfile');

    if (raw) {
      try {
        const p = JSON.parse(raw);

        // Unir apellidos si vienen separados
        const lastName = [p.lastName, p.secondLastName].filter(Boolean).join(' ').trim();

        this.userData = {
          firstName: p.firstName || 'Usuario',
          lastName: lastName || '',
          email: p.email || 'usuario@email.com',
          phone: p.phone || '+56 9 1234 5678',
          rut: p.rut || '12.345.678-9',
          membership: p.membership || 'Plan Básico',
          membershipPrice: p.membershipPrice || this.getMembershipPrice(p.membership),
          joinDate: p.joinDate ? new Date(p.joinDate) : new Date(),
          nextPayment: p.nextPayment ? new Date(p.nextPayment) : this.calculateNextPayment(),
          status: (p.status as UserData['status']) || 'active'
        };

        return;
      } catch {
        // continúa al fallback
      }
    }

    // Fallback si no hubo perfil o falló el parseo: usa los keys antiguos
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
      membershipPrice: this.getMembershipPrice(userMembership),
      joinDate: new Date(),
      nextPayment: this.calculateNextPayment(),
      status: 'active'
    };
  }

  getMembershipPrice(membership: string): string {
    const prices: Record<string, string> = {
      'Plan Anual MultiClub': '$14.667',
      'Plan Anual OneClub': '$14.000',
      'Plan Mensual Cargo Automático': '$21.000'
    };
    return prices[membership] || '$0';
  }

  calculateNextPayment(): Date {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  loadRecentAccess() {
    // Datos simulados de accesos recientes
    this.recentAccess = [
      { date: new Date(2025, 9, 1), time: '08:30', location: 'Sucursal Centro',       type: 'entry' },
      { date: new Date(2025, 9, 1), time: '10:15', location: 'Sucursal Centro',       type: 'exit'  },
      { date: new Date(2025, 8, 29), time: '18:45', location: 'Sucursal Providencia', type: 'entry' },
      { date: new Date(2025, 8, 29), time: '20:00', location: 'Sucursal Providencia', type: 'exit'  }
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
    const nextPayment = this.userData.nextPayment instanceof Date
      ? this.userData.nextPayment
      : new Date(this.userData.nextPayment);
    const diff = nextPayment.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}

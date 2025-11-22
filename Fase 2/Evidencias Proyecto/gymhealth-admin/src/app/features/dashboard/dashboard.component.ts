// src/app/features/dashboard/dashboard.component.ts

import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import {
  Dashboard,
  TodayDashboardSummary,
  DashboardActivityItem as ApiActivityItem,
} from '../../core/services/dashboard/dashboard';

interface DashboardStat {
  icon: string;
  value: string;
  label: string;
  badge: string;
  color: 'purple' | 'cyan' | 'orange' | 'green';
}

interface ActivityItem {
  icon: string;
  title: string;
  subtitle: string;
  timestamp: string; // ISO
  type: 'ACCESS' | 'SALE';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  host: {
    '[attr.data-theme]': 'currentTheme',
  },
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dashboardService = inject(Dashboard);

  currentTheme: string = 'dark';

  // Resumen de hoy desde el backend
  summary = signal<TodayDashboardSummary | null>(null);
  isLoading = signal(false);
  hasError = signal(false);

  // Estadísticas que SÍ están en el endpoint:
  // - uniquePeopleCount  -> Personas distintas hoy
  // - accessCount        -> Accesos hoy
  // - salesAmount        -> Ventas hoy
  stats = signal<DashboardStat[]>([]);

  // Actividad reciente (ACCESS + SALE)
  activities = signal<ActivityItem[]>([]);

  ngOnInit(): void {
    this.currentTheme =
      document.documentElement.getAttribute('data-theme') || 'dark';
    this.observeThemeChanges();

    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    // Nada por ahora, pero queda para futuras subscripciones manuales
  }

  private observeThemeChanges(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          this.currentTheme =
            document.documentElement.getAttribute('data-theme') || 'dark';
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  // ========================
  // Carga de datos reales
  // ========================
  loadDashboardData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.dashboardService.getTodaySummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.mapStats(summary);
        this.mapActivities(summary.activities);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando dashboard de hoy', err);
        this.summary.set(null);
        this.stats.set([]);
        this.activities.set([]);
        this.isLoading.set(false);
        this.hasError.set(true);
      },
    });
  }

  private mapStats(summary: TodayDashboardSummary): void {
    const people = summary.uniquePeopleCount ?? 0;
    const accesses = summary.accessCount ?? 0;
    const sales = summary.salesAmount ?? 0;

    const salesFormatted = this.formatAmount(sales, summary.salesCurrency);

    const stats: DashboardStat[] = [
      {
        icon: 'people',
        value: people.toString(),
        label: 'Personas distintas hoy',
        badge: 'Accedieron al menos 1 vez',
        color: 'purple',
      },
      {
        icon: 'login',
        value: accesses.toString(),
        label: 'Accesos hoy',
        badge: 'Entradas registradas',
        color: 'green',
      },
      {
        icon: 'attach_money',
        value: salesFormatted,
        label: 'Ventas de hoy',
        badge: summary.salesCurrency || 'CLP',
        color: 'orange',
      },
    ];

    this.stats.set(stats);
  }

  private mapActivities(apiItems: ApiActivityItem[]): void {
    const items: ActivityItem[] = apiItems.map((item) => {
      const isAccess = item.type === 'ACCESS';
      const icon = isAccess ? 'login' : 'attach_money';

      let title: string;

      if (isAccess) {
        if (item.result === 'GRANTED') {
          title = `${item.userFullName} ingresó al gimnasio`;
        } else if (item.result === 'DENIED') {
          title = `${item.userFullName} no pudo ingresar al gimnasio`;
        } else {
          // fallback por si viene null/otro valor
          title = `${item.userFullName} tuvo un evento de acceso`;
        }
      } else {
        title = `Venta por ${this.formatAmount(
          item.amount ?? 0,
          item.currency,
        )} (${item.userFullName})`;
      }

      const branchLabel = item.branchName ?? 'Sucursal';
      const subtitle = `${branchLabel} · ${item.rut}`;

      return {
        icon,
        title,
        subtitle,
        timestamp: item.timestamp,
        type: item.type,
      };
    });

    this.activities.set(items);
  }

  private formatAmount(amount: number, currency?: string | null): string {
    const safeCurrency = currency || 'CLP';
    const formatted = amount.toLocaleString('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${formatted} ${safeCurrency}`;
  }
}

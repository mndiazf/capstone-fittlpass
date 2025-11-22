// src/services/dashboard/dashboard.service.ts
import {
  PgDashboardRepository,
  TodayDashboardCountsRow,
  DashboardActivityRow,
  DashboardActivityType,
} from '../../repositories/dashboard/dashboard.repository';

export interface DashboardActivityItem {
  id: string;
  type: DashboardActivityType;
  timestamp: string; // ISO string
  userFullName: string;
  rut: string;
  branchId: string;
  branchName: string | null;
  result: 'GRANTED' | 'DENIED' | null;
  source: string | null;
  amount: number | null;
  currency: string | null;
  description: string;
}

export interface TodayDashboardSummary {
  date: string; // YYYY-MM-DD
  branchId: string;
  accessCount: number;
  uniquePeopleCount: number;
  salesAmount: number;
  salesCurrency: string;
  activities: DashboardActivityItem[];
}

export class DashboardService {
  constructor(
    private readonly dashboardRepo: PgDashboardRepository,
  ) {}

  /**
   * Devuelve el resumen del día de hoy para una sucursal.
   * "Hoy" se calcula en base a la fecha del servidor:
   *   desde 00:00:00.000 hasta 23:59:59.999 de la fecha actual.
   */
  public async getTodaySummary(
    branchId: string,
  ): Promise<TodayDashboardSummary> {
    const now = new Date();

    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );

    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const [countsRow, activitiesRows] = await Promise.all([
      this.dashboardRepo.getTodayCounts(branchId, startOfDay, endOfDay),
      this.dashboardRepo.getTodayActivities(branchId, startOfDay, endOfDay, 50),
    ]);

    const accessCount = Number(countsRow.access_count ?? 0);
    const uniquePeopleCount = Number(countsRow.unique_users ?? 0);
    const salesAmount = Number(countsRow.sales_amount ?? 0);

    const activities: DashboardActivityItem[] = activitiesRows.map((row) =>
      this.mapActivityRow(row),
    );

    const dateStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    return {
      date: dateStr,
      branchId,
      accessCount,
      uniquePeopleCount,
      salesAmount,
      salesCurrency: 'CLP', // si más adelante soportas otra moneda lo puedes ajustar
      activities,
    };
  }

  private mapActivityRow(row: DashboardActivityRow): DashboardActivityItem {
    const amountNumber =
      row.amount != null ? Number(row.amount) : null;

    let description: string;
    if (row.activity_type === 'ACCESS') {
      const estado =
        row.result === 'GRANTED' ? 'exitoso' : 'rechazado';
      description = `Acceso ${estado}`;
    } else {
      const monto = amountNumber != null
        ? amountNumber.toLocaleString('es-CL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })
        : '0';
      const currency = row.currency ?? 'CLP';
      description = `Venta por ${monto} ${currency}`;
    }

    return {
      id: row.id,
      type: row.activity_type,
      timestamp: row.at instanceof Date
        ? row.at.toISOString()
        : new Date(row.at).toISOString(),
      userFullName: row.full_name,
      rut: row.rut,
      branchId: row.branch_id,
      branchName: row.branch_name,
      result: row.result,
      source: row.source,
      amount: amountNumber,
      currency: row.currency,
      description,
    };
  }
}

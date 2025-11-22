// src/repositories/access/access-log.repository.ts
import { query } from '../../config/db';
import { PeriodUnit } from '../membership/membership-plan.repository';

export interface AccessLogRow {
  id: string;
  user_id: string;
  branch_id: string | null;
  branch_name: string | null;
  created_at: Date;
  result: string;
}

export class PgAccessLogRepository {
  /**
   * Accesos de los últimos N días (para el endpoint de última semana).
   */
  public async findLastDaysByUserId(
    userId: string,
    days: number,
  ): Promise<AccessLogRow[]> {
    const result = await query<AccessLogRow>(
      `
      SELECT
        al.id,
        al.user_id,
        al.branch_id,
        b.name AS branch_name,
        al.created_at,
        al.result
      FROM public.access_log al
      LEFT JOIN public.branch b ON b.id = al.branch_id
      WHERE al.user_id = $1
        AND al.created_at >= NOW() - ($2::int * INTERVAL '1 day')
      ORDER BY al.created_at DESC;
      `,
      [userId, days],
    );

    return result.rows;
  }

  /**
   * Cuenta días distintos de asistencia en el período actual,
   * según periodUnit + periodLength (para planes limitados).
   */
  public async countDistinctDaysInCurrentPeriod(
    userId: string,
    periodUnit: PeriodUnit,
    periodLength: number,
  ): Promise<number> {
    if (periodLength <= 0) {
      return 0;
    }

    if (periodUnit === 'TOTAL') {
      const totalRes = await query<{ used_days: number }>(
        `
        SELECT COUNT(DISTINCT DATE(al.created_at))::int AS used_days
        FROM public.access_log al
        WHERE al.user_id = $1;
        `,
        [userId],
      );

      const rawTotal = totalRes.rows[0]?.used_days ?? 0;
      return Number(rawTotal);
    }

    let intervalExpr: string;

    switch (periodUnit) {
      case 'WEEK':
        intervalExpr = '($2::int * INTERVAL \'1 week\')';
        break;
      case 'MONTH':
        intervalExpr = '($2::int * INTERVAL \'1 month\')';
        break;
      default:
        // Si llega algo inesperado, no filtramos por tiempo
        const res = await query<{ used_days: number }>(
          `
          SELECT COUNT(DISTINCT DATE(al.created_at))::int AS used_days
          FROM public.access_log al
          WHERE al.user_id = $1;
          `,
          [userId],
        );
        return Number(res.rows[0]?.used_days ?? 0);
    }

    const result = await query<{ used_days: number }>(
      `
      SELECT COUNT(DISTINCT DATE(al.created_at))::int AS used_days
      FROM public.access_log al
      WHERE al.user_id = $1
        AND al.created_at >= NOW() - ${intervalExpr};
      `,
      [userId, periodLength],
    );

    const raw = result.rows[0]?.used_days ?? 0;
    return Number(raw);
  }
}

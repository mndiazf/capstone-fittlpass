// src/repositories/membership/membership-day-usage.repository.ts
import { query } from '../../config/db';
import { PeriodUnit } from './membership-plan.repository';

export interface MembershipDayUsageRow {
  id: string;
  membership_id: string;
  usage_date: string;   // date en texto ISO (YYYY-MM-DD)
  created_at: Date;
}

export class PgMembershipDayUsageRepository {
  /**
   * Cuenta días distintos usados por una membresía en el "período actual",
   * según periodUnit + periodLength.
   *
   * Para TRIAL_3D_WEEK:
   *   periodUnit: 'WEEK'
   *   periodLength: 1
   *   => últimos 7 días.
   */
  public async countDistinctDaysInCurrentPeriod(
    membershipId: string,
    periodUnit: PeriodUnit,
    periodLength: number,
  ): Promise<number> {
    if (periodLength <= 0) {
      return 0;
    }

    // Caso TOTAL: cuenta todos los días usados en la membresía.
    if (periodUnit === 'TOTAL') {
      const totalRes = await query<{ used_days: number }>(
        `
        SELECT COUNT(DISTINCT usage_date)::int AS used_days
        FROM public.membership_day_usage
        WHERE membership_id = $1;
        `,
        [membershipId],
      );

      return Number(totalRes.rows[0]?.used_days ?? 0);
    }

    let intervalExpr: string;

    switch (periodUnit) {
      case 'WEEK':
        intervalExpr = '($2::int * INTERVAL \'1 week\')';
        break;
      case 'MONTH':
        intervalExpr = '($2::int * INTERVAL \'1 month\')';
        break;
      default: {
        // fallback: sin filtro de período
        const res = await query<{ used_days: number }>(
          `
          SELECT COUNT(DISTINCT usage_date)::int AS used_days
          FROM public.membership_day_usage
          WHERE membership_id = $1;
          `,
          [membershipId],
        );
        return Number(res.rows[0]?.used_days ?? 0);
      }
    }

    const result = await query<{ used_days: number }>(
      `
      SELECT COUNT(DISTINCT usage_date)::int AS used_days
      FROM public.membership_day_usage
      WHERE membership_id = $1
        AND created_at >= NOW() - ${intervalExpr};
      `,
      [membershipId, periodLength],
    );

    return Number(result.rows[0]?.used_days ?? 0);
  }
}

// src/repositories/dashboard/dashboard.repository.ts
import { query } from '../../config/db';

export type DashboardActivityType = 'ACCESS' | 'SALE';

export interface TodayDashboardCountsRow {
  access_count: string | number | null;
  unique_users: string | number | null;
  sales_amount: string | number | null;
}

export interface DashboardActivityRow {
  id: string;
  activity_type: DashboardActivityType;
  at: Date;
  full_name: string;
  rut: string;
  branch_id: string;
  branch_name: string | null;
  amount: string | null;
  currency: string | null;
  result: 'GRANTED' | 'DENIED' | null;
  source: string | null;
  reason: string | null;
}

export class PgDashboardRepository {
  /**
   * Obtiene los contadores del día de hoy (rango [from, to]) para una sucursal.
   * - access_count: cantidad de accesos GRANTED
   * - unique_users: cantidad de usuarios distintos con al menos un acceso GRANTED
   * - sales_amount: suma de ventas (membership_payment.amount)
   */
  public async getTodayCounts(
    branchId: string,
    from: Date,
    to: Date,
  ): Promise<TodayDashboardCountsRow> {
    const sql = `
      SELECT
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM public.access_log al
          WHERE al.branch_id = $1
            AND al.result = 'GRANTED'
            AND al.created_at >= $2
            AND al.created_at <= $3
        ), 0) AS access_count,
        COALESCE((
          SELECT COUNT(DISTINCT al.user_id)::bigint
          FROM public.access_log al
          WHERE al.branch_id = $1
            AND al.result = 'GRANTED'
            AND al.created_at >= $2
            AND al.created_at <= $3
        ), 0) AS unique_users,
        COALESCE((
          SELECT SUM(mp.amount)::numeric(12,2)
          FROM public.membership_payment mp
          WHERE mp.branch_id = $1
            AND mp.paid_at >= $2
            AND mp.paid_at <= $3
        ), 0) AS sales_amount;
    `;

    const result = await query<TodayDashboardCountsRow>(sql, [branchId, from, to]);
    return result.rows[0] ?? {
      access_count: 0,
      unique_users: 0,
      sales_amount: 0,
    };
  }

  /**
   * Actividades recientes de hoy: accesos + ventas mezcladas.
   * Se limita por "limit" y se ordena de más reciente a más antiguo.
   */
  public async getTodayActivities(
    branchId: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<DashboardActivityRow[]> {
    const sql = `
      SELECT
        t.id,
        t.activity_type,
        t.at,
        t.full_name,
        t.rut,
        t.branch_id,
        t.branch_name,
        t.amount,
        t.currency,
        t.result,
        t.source,
        t.reason
      FROM (
        -- Accesos
        SELECT
          al.id,
          'ACCESS' AS activity_type,
          al.created_at AS at,
          (
            u.first_name ||
            CASE
              WHEN u.middle_name IS NOT NULL AND u.middle_name <> ''
                THEN ' ' || u.middle_name
              ELSE ''
            END ||
            ' ' || u.last_name ||
            CASE
              WHEN u.second_last_name IS NOT NULL AND u.second_last_name <> ''
                THEN ' ' || u.second_last_name
              ELSE ''
            END
          ) AS full_name,
          u.rut,
          b.id   AS branch_id,
          b.name AS branch_name,
          NULL::numeric(12,2) AS amount,
          NULL::varchar(3)    AS currency,
          al.result,
          al.source,
          al.reason
        FROM public.access_log al
        JOIN public.app_user u ON u.id = al.user_id
        JOIN public.branch   b ON b.id = al.branch_id
        WHERE al.branch_id = $1
          AND al.created_at >= $2
          AND al.created_at <= $3

        UNION ALL

        -- Ventas (pagos de membresía)
        SELECT
          mp.id,
          'SALE' AS activity_type,
          mp.paid_at AS at,
          (
            u.first_name ||
            CASE
              WHEN u.middle_name IS NOT NULL AND u.middle_name <> ''
                THEN ' ' || u.middle_name
              ELSE ''
            END ||
            ' ' || u.last_name ||
            CASE
              WHEN u.second_last_name IS NOT NULL AND u.second_last_name <> ''
                THEN ' ' || u.second_last_name
              ELSE ''
            END
          ) AS full_name,
          u.rut,
          COALESCE(b.id, mp.branch_id)   AS branch_id,
          COALESCE(b.name, 'Sucursal')   AS branch_name,
          mp.amount,
          mp.currency,
          NULL AS result,
          'PAYMENT' AS source,
          NULL AS reason
        FROM public.membership_payment mp
        JOIN public.app_user u ON u.id = mp.user_id
        LEFT JOIN public.branch b ON b.id = mp.branch_id
        WHERE mp.branch_id = $1
          AND mp.paid_at >= $2
          AND mp.paid_at <= $3
      ) AS t
      ORDER BY t.at DESC
      LIMIT $4;
    `;

    const result = await query<DashboardActivityRow>(sql, [
      branchId,
      from,
      to,
      limit,
    ]);

    return result.rows;
  }
}

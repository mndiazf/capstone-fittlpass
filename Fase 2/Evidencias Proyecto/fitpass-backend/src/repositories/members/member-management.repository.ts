import { query } from '../../config/db';

export type AccessStatus = 'NO_ENROLADO' | 'ACTIVO' | 'BLOQUEADO';

export interface MemberSearchRow {
  id: string;
  rut: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  updated_at: string;
  access_status: AccessStatus;

  membership_status: 'ACTIVE' | 'EXPIRED' | null;
  membership_end_date: string | null;
  membership_plan_name: string | null;
  membership_plan_code: string | null;
  membership_scope: 'ONECLUB' | 'MULTICLUB' | null;

  // Datos del plan limitado
  membership_is_usage_limited: boolean | null;
  membership_max_days_per_period: number | null;
  membership_period_unit: 'WEEK' | 'MONTH' | 'TOTAL' | null;
  membership_period_length: number | null;

  // Uso de días (según membership_day_usage)
  membership_used_days: number | null;

  last_access_at: string | null;
  monthly_access_count: number;

  last_payment_at: string | null;
  outstanding_debt: string; // numeric(12,2) viene como string
}

export interface AccessHistoryRow {
  id: string;
  created_at: string;
  branch_name: string;
  result: 'GRANTED' | 'DENIED'; // <- viene desde access_log.result
}

export interface AppUserAccessRow {
  id: string;
  access_status: AccessStatus;
}

export interface MemberManagementRepository {
  /**
   * term: texto / rut
   * limit: máximo de resultados
   * branchId: sucursal del staff que busca (puede ser null)
   */
  searchMembersByQuery(
    term: string,
    limit: number,
    branchId: string | null,
  ): Promise<MemberSearchRow[]>;

  getAccessHistoryForMember(
    userId: string,
    limit: number
  ): Promise<AccessHistoryRow[]>;

  updateAccessStatus(
    userId: string,
    status: AccessStatus
  ): Promise<AppUserAccessRow | null>;
}

export class PgMemberManagementRepository implements MemberManagementRepository {
  async searchMembersByQuery(
    term: string,
    limit: number,
    branchId: string | null,
  ): Promise<MemberSearchRow[]> {
    const trimmed = term.trim();

    const cleanedRut = trimmed
      .replace(/\./g, '')
      .replace(/-/g, '')
      .replace(/\s/g, '')
      .toUpperCase();

    const result = await query<MemberSearchRow>(
      `
      SELECT
        u.id,
        u.rut,
        u.email,
        u.phone,
        u.first_name,
        u.last_name,
        u.updated_at,
        u.access_status,

        um.status         AS membership_status,
        um.end_date       AS membership_end_date,
        mp.name           AS membership_plan_name,
        mp.code           AS membership_plan_code,
        mp.plan_scope     AS membership_scope,

        -- flags de plan limitado
        mp.is_usage_limited        AS membership_is_usage_limited,
        mp.max_days_per_period     AS membership_max_days_per_period,
        mp.period_unit             AS membership_period_unit,
        mp.period_length           AS membership_period_length,

        -- días usados en el período actual (según membership_day_usage)
        COALESCE(
          CASE
            WHEN mp.is_usage_limited = true AND mp.period_unit = 'TOTAL' THEN
              (
                SELECT COUNT(*)::int
                FROM public.membership_day_usage mdu
                WHERE mdu.membership_id = um.id
              )
            WHEN mp.is_usage_limited = true
                 AND mp.period_unit IN ('WEEK','MONTH') THEN
              COALESCE(
                (
                  SELECT COUNT(*)::int
                  FROM public.membership_day_usage mdu
                  WHERE mdu.membership_id = um.id
                    AND mdu.period_start = (
                      SELECT MAX(mdu2.period_start)
                      FROM public.membership_day_usage mdu2
                      WHERE mdu2.membership_id = um.id
                        AND mdu2.period_end >= CURRENT_DATE
                    )
                ),
                0
              )
            ELSE 0
          END,
          0
        ) AS membership_used_days,

        (
          SELECT MAX(al.created_at)
          FROM public.access_log al
          WHERE al.user_id = u.id
            AND al.result = 'GRANTED'
        ) AS last_access_at,

        (
          SELECT COUNT(*)::int
          FROM public.access_log al
          WHERE al.user_id = u.id
            AND al.created_at >= (NOW() - INTERVAL '30 days')
        ) AS monthly_access_count,

        (
          SELECT MAX(p.paid_at)
          FROM public.membership_payment p
          WHERE p.user_id = u.id
        ) AS last_payment_at,

        0::numeric(12,2) AS outstanding_debt
      FROM public.app_user u
      LEFT JOIN public.user_membership um ON um.user_id = u.id
      LEFT JOIN public.membership_plan mp ON mp.code = um.plan_code
      WHERE
        (
          -- búsqueda por RUT normalizado (sin puntos, sin guion, sin espacios)
          REPLACE(
            REPLACE(
              REPLACE(UPPER(u.rut), '.', ''),
              '-',
              ''
            ),
            ' ',
            ''
          ) = $1
          OR u.email ILIKE '%' || $2 || '%'
          OR u.first_name ILIKE '%' || $2 || '%'
          OR u.last_name ILIKE '%' || $2 || '%'
          OR (u.first_name || ' ' || u.last_name) ILIKE '%' || $2 || '%'
          OR u.phone ILIKE '%' || $2 || '%'
        )
        AND (
          -- 🔐 Lógica de membresía vs sucursal:
          --  - Si NO viene branchId → se permiten todos (comportamiento antiguo).
          --  - Si viene branchId:
          --      * MULTICLUB → siempre permitido.
          --      * ONECLUB  → sólo si um.branch_id = branchId.
          --      * Sin membresía (plan_scope NULL) → permitido.
          $4::text IS NULL
          OR mp.plan_scope IS NULL
          OR mp.plan_scope = 'MULTICLUB'
          OR (
            mp.plan_scope = 'ONECLUB'
            AND um.branch_id = $4
          )
        )
      ORDER BY u.updated_at DESC
      LIMIT $3;
      `,
      [cleanedRut, trimmed, limit, branchId],
    );

    return result.rows;
  }

  async getAccessHistoryForMember(
    userId: string,
    limit: number
  ): Promise<AccessHistoryRow[]> {
    const result = await query<AccessHistoryRow>(
      `
      SELECT
        al.id,
        al.created_at,
        b.name AS branch_name,
        al.result
      FROM public.access_log al
      JOIN public.branch b ON b.id = al.branch_id
      WHERE al.user_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2;
      `,
      [userId, limit],
    );

    return result.rows;
  }

  async updateAccessStatus(
    userId: string,
    status: AccessStatus
  ): Promise<AppUserAccessRow | null> {
    const result = await query<AppUserAccessRow>(
      `
      UPDATE public.app_user
      SET access_status = $2,
          updated_at    = NOW()
      WHERE id = $1
      RETURNING id, access_status;
      `,
      [userId, status],
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }
}

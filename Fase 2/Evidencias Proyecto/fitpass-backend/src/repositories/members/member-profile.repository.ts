import { query } from '../../config/db';

export interface AppUserRow {
  id: string;
  rut: string;
  email: string;
  phone: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  second_last_name: string | null;
  access_status: 'NO_ENROLADO' | 'ACTIVO' | 'BLOQUEADO';
  status: string | null;
}

export interface MembershipRow {
  membership_id: string;
  membership_status: 'ACTIVE' | 'EXPIRED';
  start_date: string;   // 'YYYY-MM-DD'
  end_date: string;     // 'YYYY-MM-DD'
  branch_id: string | null;
  branch_name: string | null;
  plan_code: string;
  plan_name: string;
  plan_scope: 'ONECLUB' | 'MULTICLUB';
}

export interface FaceEnrollmentRow {
  status: 'NOT_ENROLLED' | 'ENROLLED';
}

export interface MemberProfileRepository {
  findUserByNormalizedRut(normalizedRut: string): Promise<AppUserRow | null>;
  findMembershipForUserAndBranch(
    userId: string,
    branchId: string
  ): Promise<MembershipRow | null>;
  findLastFaceEnrollment(userId: string): Promise<FaceEnrollmentRow | null>;
}

export class PgMemberProfileRepository implements MemberProfileRepository {
  async findUserByNormalizedRut(
    normalizedRut: string
  ): Promise<AppUserRow | null> {
    const result = await query<AppUserRow>(
      `
      SELECT
        id,
        rut,
        email,
        phone,
        first_name,
        middle_name,
        last_name,
        second_last_name,
        access_status,
        status
      FROM public.app_user
      WHERE REPLACE(REPLACE(UPPER(rut), '.', ''), ' ', '') = $1
      LIMIT 1;
      `,
      [normalizedRut],
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findMembershipForUserAndBranch(
    userId: string,
    branchId: string
  ): Promise<MembershipRow | null> {
    const result = await query<MembershipRow>(
      `
      SELECT
        m.id          AS membership_id,
        m.status      AS membership_status,
        m.start_date  AS start_date,
        m.end_date    AS end_date,
        m.branch_id   AS branch_id,
        b.name        AS branch_name,
        mp.code       AS plan_code,
        mp.name       AS plan_name,
        mp.plan_scope AS plan_scope
      FROM public.user_membership m
      JOIN public.membership_plan mp
        ON mp.code = m.plan_code
      LEFT JOIN public.branch b
        ON b.id = m.branch_id
      WHERE m.user_id = $1
        AND (
          -- ONECLUB → sólo válido si la membresía está asociada a esta sucursal
          (mp.plan_scope = 'ONECLUB'   AND m.branch_id = $2)
          OR
          -- MULTICLUB → branch_id NULL, válida para todas las sucursales
          (mp.plan_scope = 'MULTICLUB' AND m.branch_id IS NULL)
        )
      ORDER BY
        (m.status = 'ACTIVE') DESC,
        m.end_date DESC
      LIMIT 1;
      `,
      [userId, branchId],
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findLastFaceEnrollment(
    userId: string
  ): Promise<FaceEnrollmentRow | null> {
    const result = await query<FaceEnrollmentRow>(
      `
      SELECT status
      FROM public.face_enrollment
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1;
      `,
      [userId],
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }
}

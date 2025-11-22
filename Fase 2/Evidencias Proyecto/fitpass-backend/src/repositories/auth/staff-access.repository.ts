import { query } from '../../config/db';

export interface StaffRoleRow {
  branch_id: string | null;
  branch_code: string | null;
  branch_name: string | null;
  role_id: string;
  role_code: string;
  role_name: string;
  role_kind: 'MEMBER' | 'STAFF';
}

export interface StaffProfileRow {
  app_user_profile_id: string;
  branch_id: string | null;
  branch_code: string | null;
  branch_name: string | null;
  profile_id: string;
  profile_name: string;
  profile_description: string | null;
}

export interface ProfilePermissionRow {
  profile_id: string;
  permission_code: string;
  permission_name: string;
  can_view: boolean;
  can_edit: boolean;
}

export class PgStaffAccessRepository {
  /**
   * "Roles" derivados de perfiles (app_user_profile + user_profile + branch)
   * Mantiene la interfaz StaffRoleRow pero mapea cada perfil como un rol STAFF.
   */
  async findRolesByUserId(userId: string): Promise<StaffRoleRow[]> {
    const sql = `
      SELECT
        ap.branch_id,
        b.code        AS branch_code,
        b."name"      AS branch_name,
        p.id          AS role_id,
        p."name"      AS role_code,
        p."name"      AS role_name,
        'STAFF'::varchar(5) AS role_kind
      FROM public.app_user_profile ap
      JOIN public.user_profile p
        ON p.id = ap.profile_id
      LEFT JOIN public.branch b
        ON b.id = ap.branch_id
      WHERE ap.user_id = $1
        AND ap.active = true
    `;

    const result = await query<StaffRoleRow>(sql, [userId]);
    return result.rows;
  }

  /**
   * Perfiles asignados al usuario (app_user_profile + user_profile + branch)
   */
  async findProfilesByUserId(userId: string): Promise<StaffProfileRow[]> {
    const sql = `
      SELECT
        aup.id         AS app_user_profile_id,
        aup.branch_id  AS branch_id,
        b.code         AS branch_code,
        b."name"       AS branch_name,
        up.id          AS profile_id,
        up."name"      AS profile_name,
        up.description AS profile_description
      FROM public.app_user_profile aup
      JOIN public.user_profile up
        ON up.id = aup.profile_id
      LEFT JOIN public.branch b
        ON b.id = aup.branch_id
      WHERE aup.user_id = $1
        AND aup.active = true
    `;
    const result = await query<StaffProfileRow>(sql, [userId]);
    return result.rows;
  }

  /**
   * Permisos por perfil (user_profile_permission + ui_permission)
   */
  async findPermissionsByProfileIds(
    profileIds: string[],
  ): Promise<ProfilePermissionRow[]> {
    if (profileIds.length === 0) return [];

    const sql = `
      SELECT
        upp.profile_id,
        p.code   AS permission_code,
        p."name" AS permission_name,
        -- tu tabla no tiene can_view/can_edit: devolvemos constantes
        true  AS can_view,
        false AS can_edit
      FROM public.user_profile_permission upp
      JOIN public.ui_permission p
        ON p.id = upp.permission_id
      WHERE upp.profile_id = ANY($1::varchar[])
    `;

    const result = await query<ProfilePermissionRow>(sql, [profileIds]);
    return result.rows;
  }
}

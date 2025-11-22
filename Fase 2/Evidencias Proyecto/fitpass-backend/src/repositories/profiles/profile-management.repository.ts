import { randomUUID } from 'crypto';
import { query } from '../../config/db';

export interface UserProfileRow {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface UiPermissionRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

// 👇 ya no usamos can_view / can_edit en ningún lado
export interface ProfileWithPermissionsRow {
  profile_id: string;
  branch_id: string;
  profile_name: string;
  profile_description: string | null;
  is_default: boolean;
  permission_id: string | null;
  permission_code: string | null;
  permission_name: string | null;
  permission_description: string | null;
}

export interface AppUserProfileRow {
  id: string;
  user_id: string;
  profile_id: string;
  branch_id: string;
  active: boolean;
  created_at: string;
  ended_at: string | null;
}

export interface UserProfileAssignmentRow {
  assignment_id: string;
  user_id: string;
  profile_id: string;
  profile_name: string;
  branch_id: string;
  active: boolean;
  created_at: string;
  ended_at: string | null;
}

export interface CreateProfileInput {
  branchId: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  // lista de ids de ui_permission asociados al perfil
  permissionIds?: string[];
}

export interface UpdateProfileInput {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  // reemplaza completamente los permisos
  permissionIds?: string[];
}

export interface ProfileManagementRepository {
  // permisos base de UI
  getAllPermissions(): Promise<UiPermissionRow[]>;

  // perfiles
  getAllProfilesWithPermissions(branchId: string): Promise<ProfileWithPermissionsRow[]>;
  getProfileById(id: string): Promise<UserProfileRow | null>;
  getProfilePermissions(profileId: string): Promise<UiPermissionRow[]>;

  createProfile(input: CreateProfileInput): Promise<UserProfileRow>;
  updateProfile(id: string, input: UpdateProfileInput): Promise<UserProfileRow | null>;
  deleteProfile(id: string): Promise<void>;

  // staff / asignaciones
  getUserProfiles(userId: string): Promise<UserProfileAssignmentRow[]>;
  assignProfileToUser(
    userId: string,
    profileId: string
  ): Promise<AppUserProfileRow>;

  deactivateAssignment(assignmentId: string): Promise<void>;
  isStaffUser(userId: string): Promise<boolean>;
}

export class PgProfileManagementRepository implements ProfileManagementRepository {
  async getAllPermissions(): Promise<UiPermissionRow[]> {
    const result = await query<UiPermissionRow>(
      `
      SELECT id, code, name, description
      FROM public.ui_permission
      ORDER BY code ASC;
      `
    );

    return result.rows;
  }

  async getAllProfilesWithPermissions(
    branchId: string
  ): Promise<ProfileWithPermissionsRow[]> {
    const result = await query<ProfileWithPermissionsRow>(
      `
      SELECT
        p.id          AS profile_id,
        p.branch_id   AS branch_id,
        p.name        AS profile_name,
        p.description AS profile_description,
        p.is_default,
        up.permission_id,
        perm.code        AS permission_code,
        perm.name        AS permission_name,
        perm.description AS permission_description
      FROM public.user_profile p
      LEFT JOIN public.user_profile_permission up
        ON up.profile_id = p.id
      LEFT JOIN public.ui_permission perm
        ON perm.id = up.permission_id
      WHERE p.branch_id = $1
      ORDER BY p.name ASC, perm.code ASC;
      `,
      [branchId]
    );

    return result.rows;
  }

  async getProfileById(id: string): Promise<UserProfileRow | null> {
    const result = await query<UserProfileRow>(
      `
      SELECT id, branch_id, name, description, is_default, created_at, updated_at
      FROM public.user_profile
      WHERE id = $1;
      `,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async getProfilePermissions(profileId: string): Promise<UiPermissionRow[]> {
    const result = await query<UiPermissionRow>(
      `
      SELECT perm.id, perm.code, perm.name, perm.description
      FROM public.user_profile_permission up
      JOIN public.ui_permission perm ON perm.id = up.permission_id
      WHERE up.profile_id = $1
      ORDER BY perm.code ASC;
      `,
      [profileId]
    );

    return result.rows;
  }

  async createProfile(input: CreateProfileInput): Promise<UserProfileRow> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const isDefault = input.isDefault ?? false;

    const result = await query<UserProfileRow>(
      `
      INSERT INTO public.user_profile
        (id, branch_id, name, description, is_default, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $6)
      RETURNING id, branch_id, name, description, is_default, created_at, updated_at;
      `,
      [id, input.branchId, input.name.trim(), input.description ?? null, isDefault, now]
    );

    const profile = result.rows[0];

    // Insertar permisos asociados (si vienen)
    if (input.permissionIds && input.permissionIds.length > 0) {
      const values: unknown[] = [];
      const chunks: string[] = [];

      input.permissionIds.forEach((permId, index) => {
        const baseIndex = index * 2;
        chunks.push(
          `($${baseIndex + 1}, $${baseIndex + 2})`
        );
        values.push(profile.id, permId);
      });

      await query(
        `
        INSERT INTO public.user_profile_permission
          (profile_id, permission_id)
        VALUES
          ${chunks.join(', ')};
        `,
        values
      );
    }

    return profile;
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<UserProfileRow | null> {
    const existing = await this.getProfileById(id);
    if (!existing) {
      return null;
    }

    const newName = input.name?.trim() ?? existing.name;
    const newDescription =
      input.description !== undefined ? input.description : existing.description;
    const newIsDefault =
      input.isDefault !== undefined ? input.isDefault : existing.is_default;
    const now = new Date().toISOString();

    const result = await query<UserProfileRow>(
      `
      UPDATE public.user_profile
      SET name = $2,
          description = $3,
          is_default = $4,
          updated_at = $5
      WHERE id = $1
      RETURNING id, branch_id, name, description, is_default, created_at, updated_at;
      `,
      [id, newName, newDescription, newIsDefault, now]
    );

    const profile = result.rows[0];

    // Si vienen permisos, reemplazamos el set completo
    if (input.permissionIds) {
      await query(
        `DELETE FROM public.user_profile_permission WHERE profile_id = $1;`,
        [id]
      );

      if (input.permissionIds.length > 0) {
        const values: unknown[] = [];
        const chunks: string[] = [];

        input.permissionIds.forEach((permId, index) => {
          const baseIndex = index * 2;
          chunks.push(
            `($${baseIndex + 1}, $${baseIndex + 2})`
          );
          values.push(id, permId);
        });

        await query(
          `
          INSERT INTO public.user_profile_permission
            (profile_id, permission_id)
          VALUES
            ${chunks.join(', ')};
          `,
          values
        );
      }
    }

    return profile;
  }

  async deleteProfile(id: string): Promise<void> {
    await query(
      `DELETE FROM public.user_profile WHERE id = $1;`,
      [id]
    );
  }

  async getUserProfiles(userId: string): Promise<UserProfileAssignmentRow[]> {
    const result = await query<UserProfileAssignmentRow>(
      `
      SELECT
        ap.id      AS assignment_id,
        ap.user_id,
        ap.profile_id,
        p.name     AS profile_name,
        ap.branch_id,
        ap.active,
        ap.created_at,
        ap.ended_at
      FROM public.app_user_profile ap
      JOIN public.user_profile p ON p.id = ap.profile_id
      WHERE ap.user_id = $1
      ORDER BY ap.created_at DESC;
      `,
      [userId]
    );

    return result.rows;
  }

  async assignProfileToUser(
    userId: string,
    profileId: string
  ): Promise<AppUserProfileRow> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const result = await query<AppUserProfileRow>(
      `
      INSERT INTO public.app_user_profile
        (id, user_id, profile_id, branch_id, active, created_at, ended_at)
      SELECT
        $1, $2, p.id, p.branch_id, true, $3, NULL
      FROM public.user_profile p
      WHERE p.id = $4
      RETURNING id, user_id, profile_id, branch_id, active, created_at, ended_at;
      `,
      [id, userId, now, profileId]
    );

    if (result.rows.length === 0) {
      const err: any = new Error('PROFILE_NOT_FOUND');
      err.status = 404;
      throw err;
    }

    return result.rows[0];
  }

  async deactivateAssignment(assignmentId: string): Promise<void> {
    const now = new Date().toISOString();
    await query(
      `
      UPDATE public.app_user_profile
      SET active = false,
          ended_at = $2
      WHERE id = $1;
      `,
      [assignmentId, now]
    );
  }

  /**
   * Ahora consideramos "staff" a cualquier usuario que tenga
   * al menos un perfil asignado (app_user_profile) activo.
   */
  async isStaffUser(userId: string): Promise<boolean> {
    const result = await query<{ is_staff: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM public.app_user_profile ap
        WHERE ap.user_id = $1
          AND ap.active = true
      ) AS is_staff;
      `,
      [userId]
    );

    return result.rows[0]?.is_staff ?? false;
  }
}

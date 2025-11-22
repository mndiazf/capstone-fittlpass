// src/repositories/staff/staff-users.repository.ts
import { randomUUID } from 'crypto';
import { query } from '../../config/db';

export interface StaffProfileRow {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffUserSearchRow {
  user_id: string;
  full_name: string;
  rut: string;
  email: string;
  branch_id: string;
  branch_name: string;
  profile_id: string;
  profile_name: string;
  active: boolean;
}

export interface StaffUserDetailRow {
  user_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  second_last_name: string | null;
  rut: string;
  email: string;
  phone: string | null;
  status: string | null;
  access_status: string;
  branch_id: string;
  branch_name: string;
  profile_id: string;
  profile_name: string;
  active: boolean;
}

export interface CreateStaffUserInput {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  secondLastName?: string | null;
  rut: string;
  email: string;
  phone?: string | null;
  branchId: string;
  profileId: string;
  isActive: boolean;
  passwordHash: string | null; // ya viene calculado (o null)
}

export interface UpdateStaffUserInput extends Partial<CreateStaffUserInput> {
  // id se pasa aparte
}

export class PgStaffUsersRepository {
  // === Perfiles de staff (por sucursal) ===
  async getProfilesByBranch(branchId: string): Promise<StaffProfileRow[]> {
    const result = await query<StaffProfileRow>(
      `
      SELECT id, branch_id, name, description, is_default, created_at, updated_at
      FROM public.user_profile
      WHERE branch_id = $1
      ORDER BY name ASC;
      `,
      [branchId],
    );

    return result.rows;
  }

  async getProfileById(profileId: string): Promise<StaffProfileRow | null> {
    const result = await query<StaffProfileRow>(
      `
      SELECT id, branch_id, name, description, is_default, created_at, updated_at
      FROM public.user_profile
      WHERE id = $1;
      `,
      [profileId],
    );
    return result.rows[0] ?? null;
  }

  // === Búsqueda autocomplete por nombre o RUT, restringida a UNA sucursal ===
  async searchStaffUsers(
    term: string,
    branchId: string,
    limit = 10,
  ): Promise<StaffUserSearchRow[]> {
    const like = `%${term}%`;

    const result = await query<StaffUserSearchRow>(
      `
      SELECT
        u.id AS user_id,
        trim(u.first_name || ' ' || u.last_name || ' ' || coalesce(u.second_last_name, '')) AS full_name,
        u.rut,
        u.email,
        aup.branch_id,
        b.name AS branch_name,
        aup.profile_id,
        p.name AS profile_name,
        aup.active
      FROM public.app_user u
      JOIN public.app_user_profile aup
        ON aup.user_id = u.id
      JOIN public.user_profile p
        ON p.id = aup.profile_id
      JOIN public.branch b
        ON b.id = aup.branch_id
      WHERE
        (
          u.rut ILIKE $1
          OR trim(u.first_name || ' ' || u.last_name || ' ' || coalesce(u.second_last_name, '')) ILIKE $2
        )
        AND aup.branch_id = $3
      ORDER BY full_name ASC
      LIMIT $4;
      `,
      [like, like, branchId, limit],
    );

    return result.rows;
  }

  // === Detalle de un staff user ===
  async getStaffUserById(userId: string): Promise<StaffUserDetailRow | null> {
    const result = await query<StaffUserDetailRow>(
      `
      SELECT
        u.id AS user_id,
        u.first_name,
        u.middle_name,
        u.last_name,
        u.second_last_name,
        u.rut,
        u.email,
        u.phone,
        u.status,
        u.access_status,
        aup.branch_id,
        b.name AS branch_name,
        aup.profile_id,
        p.name AS profile_name,
        aup.active
      FROM public.app_user u
      JOIN public.app_user_profile aup
        ON aup.user_id = u.id
      JOIN public.user_profile p
        ON p.id = aup.profile_id
      JOIN public.branch b
        ON b.id = aup.branch_id
      WHERE u.id = $1;
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  // === Crear staff user (app_user + app_user_profile) ===
  async createStaffUser(input: CreateStaffUserInput): Promise<string> {
    const userId = randomUUID();

    await query(
      `
      INSERT INTO public.app_user (
        id,
        access_status,
        created_at,
        email,
        first_name,
        last_name,
        middle_name,
        password_hash,
        phone,
        rut,
        second_last_name,
        status,
        updated_at
      )
      VALUES (
        $1,
        $2,
        NOW(),
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        NOW()
      );
      `,
      [
        userId,
        input.isActive ? 'ACTIVO' : 'BLOQUEADO',
        input.email,
        input.firstName,
        input.lastName,
        input.middleName ?? null,
        input.passwordHash,
        input.phone ?? null,
        input.rut,
        input.secondLastName ?? null,
        input.isActive ? 'ACTIVE' : 'INACTIVE',
      ],
    );

    // asignar perfil en esa sucursal
    const assignmentId = randomUUID();
    await query(
      `
      INSERT INTO public.app_user_profile (
        id,
        user_id,
        profile_id,
        branch_id,
        active,
        created_at,
        ended_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NULL);
      `,
      [
        assignmentId,
        userId,
        input.profileId,
        input.branchId,
        input.isActive,
      ],
    );

    return userId;
  }

  // === Actualizar datos básicos de staff user ===
  async updateStaffUser(
    userId: string,
    input: UpdateStaffUserInput,
  ): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.firstName !== undefined) {
      fields.push(`first_name = $${idx++}`);
      values.push(input.firstName);
    }
    if (input.lastName !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(input.lastName);
    }
    if (input.middleName !== undefined) {
      fields.push(`middle_name = $${idx++}`);
      values.push(input.middleName);
    }
    if (input.secondLastName !== undefined) {
      fields.push(`second_last_name = $${idx++}`);
      values.push(input.secondLastName);
    }
    if (input.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(input.email);
    }
    if (input.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(input.phone);
    }
    if (input.passwordHash !== undefined) {
      fields.push(`password_hash = $${idx++}`);
      values.push(input.passwordHash);
    }
    if (input.isActive !== undefined) {
      fields.push(`status = $${idx}, access_status = $${idx + 1}`);
      values.push(input.isActive ? 'ACTIVE' : 'INACTIVE');
      values.push(input.isActive ? 'ACTIVO' : 'BLOQUEADO');
      idx += 2;
    }

    if (fields.length > 0) {
      values.push(userId);
      await query(
        `
        UPDATE public.app_user
        SET ${fields.join(', ')},
            updated_at = NOW()
        WHERE id = $${idx};
        `,
        values,
      );
    }

    // mover sucursal/perfil / estado en app_user_profile
    if (
      input.branchId !== undefined ||
      input.profileId !== undefined ||
      input.isActive !== undefined
    ) {
      const aFields: string[] = [];
      const aValues: unknown[] = [];
      let aIdx = 1;

      if (input.branchId !== undefined) {
        aFields.push(`branch_id = $${aIdx++}`);
        aValues.push(input.branchId);
      }
      if (input.profileId !== undefined) {
        aFields.push(`profile_id = $${aIdx++}`);
        aValues.push(input.profileId);
      }
      if (input.isActive !== undefined) {
        aFields.push(`active = $${aIdx++}`);
        aValues.push(input.isActive);
      }

      if (aFields.length > 0) {
        aValues.push(userId);
        await query(
          `
          UPDATE public.app_user_profile
          SET ${aFields.join(', ')}
          WHERE user_id = $${aIdx};
          `,
          aValues,
        );
      }
    }
  }
}

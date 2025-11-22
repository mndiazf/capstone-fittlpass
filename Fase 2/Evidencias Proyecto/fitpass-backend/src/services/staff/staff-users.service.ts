// src/services/staff/staff-users.service.ts
import bcrypt from 'bcryptjs';
import {
  CreateStaffUserInput,
  PgStaffUsersRepository,
  StaffProfileRow,
  StaffUserDetailRow,
  StaffUserSearchRow,
  UpdateStaffUserInput,
} from '../../repositories/staff/staff-users.repository';

// 👇 nombres EXACTOS como en el seed (name)
const PASSWORD_REQUIRED_PROFILES = new Set<string>([
  'Administrador de Sucursal',
  'Recepcionista',
]);

export interface StaffProfileDto {
  id: string;
  branchId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  requiresPassword: boolean;
}

export interface StaffUserDto {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  secondLastName: string | null;
  rut: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | null;
  accessStatus: 'ACTIVO' | 'BLOQUEADO' | 'NO_ENROLADO';
  branchId: string;
  branchName: string;
  profileId: string;
  profileName: string;
  active: boolean;
}

export interface CreateStaffUserDto {
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
  password?: string;
}

export interface UpdateStaffUserDto extends Partial<CreateStaffUserDto> {}

export class StaffUsersService {
  constructor(private readonly repo = new PgStaffUsersRepository()) {}

  // =======================
  // Mappers
  // =======================
  private mapProfile(row: StaffProfileRow): StaffProfileDto {
    const requiresPassword = PASSWORD_REQUIRED_PROFILES.has(row.name);
    return {
      id: row.id,
      branchId: row.branch_id,
      name: row.name,
      description: row.description,
      isDefault: row.is_default,
      requiresPassword,
    };
  }

  private mapUser(row: StaffUserDetailRow): StaffUserDto {
    return {
      id: row.user_id,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      secondLastName: row.second_last_name,
      rut: row.rut,
      email: row.email,
      phone: row.phone,
      status: (row.status as any) ?? null,
      accessStatus: row.access_status as any,
      branchId: row.branch_id,
      branchName: row.branch_name,
      profileId: row.profile_id,
      profileName: row.profile_name,
      active: row.active,
    };
  }

  // =======================
  // Perfiles
  // =======================
  async getProfilesByBranch(branchId: string): Promise<StaffProfileDto[]> {
    const rows = await this.repo.getProfilesByBranch(branchId);
    return rows.map((r) => this.mapProfile(r));
  }

  // =======================
  // Búsqueda por nombre / RUT (restringida a sucursal)
  // =======================
  async searchUsers(
    term: string,
    branchId: string,
    limit = 10,
  ): Promise<
    {
      id: string;
      fullName: string;
      rut: string;
      email: string;
      branchId: string;
      branchName: string;
      profileId: string;
      profileName: string;
      active: boolean;
    }[]
  > {
    if (!term || term.trim().length < 2) {
      const err: any = new Error('SEARCH_TERM_TOO_SHORT');
      err.status = 400;
      throw err;
    }

    if (!branchId) {
      const err: any = new Error('BRANCH_ID_REQUIRED');
      err.status = 400;
      throw err;
    }

    const rows: StaffUserSearchRow[] = await this.repo.searchStaffUsers(
      term.trim(),
      branchId,
      limit,
    );

    return rows.map((r) => ({
      id: r.user_id,
      fullName: r.full_name,
      rut: r.rut,
      email: r.email,
      branchId: r.branch_id,
      branchName: r.branch_name,
      profileId: r.profile_id,
      profileName: r.profile_name,
      active: r.active,
    }));
  }

  // =======================
  // Detalle
  // =======================
  async getById(userId: string): Promise<StaffUserDto | null> {
    const row = await this.repo.getStaffUserById(userId);
    return row ? this.mapUser(row) : null;
  }

  // =======================
  // Crear staff user
  // =======================
  async create(input: CreateStaffUserDto): Promise<StaffUserDto> {
    // ... (resto igual que tu código original)
    // no lo toco porque no afecta la lógica de filtrado por sucursal
    // ⬇️
    if (!input.firstName?.trim()) {
      const err: any = new Error('FIRST_NAME_REQUIRED');
      err.status = 400;
      throw err;
    }
    if (!input.lastName?.trim()) {
      const err: any = new Error('LAST_NAME_REQUIRED');
      err.status = 400;
      throw err;
    }
    if (!input.rut?.trim()) {
      const err: any = new Error('RUT_REQUIRED');
      err.status = 400;
      throw err;
    }
    if (!input.email?.trim()) {
      const err: any = new Error('EMAIL_REQUIRED');
      err.status = 400;
      throw err;
    }
    if (!input.branchId) {
      const err: any = new Error('BRANCH_REQUIRED');
      err.status = 400;
      throw err;
    }
    if (!input.profileId) {
      const err: any = new Error('PROFILE_REQUIRED');
      err.status = 400;
      throw err;
    }

    const profile = await this.repo.getProfileById(input.profileId);
    if (!profile) {
      const err: any = new Error('PROFILE_NOT_FOUND');
      err.status = 404;
      throw err;
    }
    if (profile.branch_id !== input.branchId) {
      const err: any = new Error('PROFILE_BRANCH_MISMATCH');
      err.status = 400;
      throw err;
    }

    const requiresPassword = PASSWORD_REQUIRED_PROFILES.has(profile.name);
    const isActive = input.isActive ?? true;

    let passwordHash: string | null = null;
    if (requiresPassword) {
      if (!input.password || input.password.length < 8) {
        const err: any = new Error('PASSWORD_REQUIRED_FOR_PROFILE');
        err.status = 400;
        throw err;
      }
      passwordHash = await bcrypt.hash(input.password, 12);
    } else if (input.password) {
      passwordHash = null;
    }

    const repoInput: CreateStaffUserInput = {
      firstName: input.firstName.trim(),
      middleName: input.middleName ?? null,
      lastName: input.lastName.trim(),
      secondLastName: input.secondLastName ?? null,
      rut: input.rut.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone ?? null,
      branchId: input.branchId,
      profileId: input.profileId,
      isActive,
      passwordHash,
    };

    const userId = await this.repo.createStaffUser(repoInput);
    const saved = await this.repo.getStaffUserById(userId);
    if (!saved) {
      const err: any = new Error('STAFF_USER_NOT_FOUND_AFTER_CREATE');
      err.status = 500;
      throw err;
    }

    return this.mapUser(saved);
  }

  // =======================
  // Actualizar staff user
  // =======================
  async update(userId: string, input: UpdateStaffUserDto): Promise<StaffUserDto> {
    // ... igual que tu código original
    const existing = await this.repo.getStaffUserById(userId);
    if (!existing) {
      const err: any = new Error('STAFF_USER_NOT_FOUND');
      err.status = 404;
      throw err;
    }

    if (input.profileId && input.profileId !== existing.profile_id) {
      const newProfile = await this.repo.getProfileById(input.profileId);
      if (!newProfile) {
        const err: any = new Error('PROFILE_NOT_FOUND');
        err.status = 404;
        throw err;
      }
      if (input.branchId && newProfile.branch_id !== input.branchId) {
        const err: any = new Error('PROFILE_BRANCH_MISMATCH');
        err.status = 400;
        throw err;
      }
    }

    let passwordHash: string | null | undefined = undefined;

    if (input.password !== undefined) {
      const profileRow = await this.repo.getProfileById(
        input.profileId ?? existing.profile_id,
      );
      if (!profileRow) {
        const err: any = new Error('PROFILE_NOT_FOUND');
        err.status = 404;
        throw err;
      }

      const requiresPassword = PASSWORD_REQUIRED_PROFILES.has(profileRow.name);
      if (requiresPassword) {
        if (!input.password || input.password.length < 8) {
          const err: any = new Error('PASSWORD_REQUIRED_FOR_PROFILE');
          err.status = 400;
          throw err;
        }
        passwordHash = await bcrypt.hash(input.password, 12);
      } else {
        passwordHash = null;
      }
    }

    const repoInput: UpdateStaffUserInput = {
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      secondLastName: input.secondLastName,
      email: input.email,
      phone: input.phone,
      branchId: input.branchId,
      profileId: input.profileId,
      isActive: input.isActive,
      passwordHash,
    };

    await this.repo.updateStaffUser(userId, repoInput);
    const updated = await this.repo.getStaffUserById(userId);
    if (!updated) {
      const err: any = new Error('STAFF_USER_NOT_FOUND_AFTER_UPDATE');
      err.status = 500;
      throw err;
    }
    return this.mapUser(updated);
  }
}

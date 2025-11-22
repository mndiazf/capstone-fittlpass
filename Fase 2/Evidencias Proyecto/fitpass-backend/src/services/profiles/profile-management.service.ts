import {
  AppUserProfileRow,
  CreateProfileInput,
  PgProfileManagementRepository,
  ProfileManagementRepository,
  ProfileWithPermissionsRow,
  UiPermissionRow,
  UpdateProfileInput,
  UserProfileAssignmentRow,
  UserProfileRow,
} from '../../repositories/profiles/profile-management.repository';

export interface PermissionDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  // 👇 ya no usamos canView / canEdit porque a nivel de perfil
  // el acceso es "todo o nada" al módulo
}

export interface ProfileDto {
  id: string;
  branchId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  permissions: PermissionDto[];
}

export interface UserProfileAssignmentDto {
  assignmentId: string;
  userId: string;
  profileId: string;
  profileName: string;
  branchId: string;
  active: boolean;
  createdAt: Date;
  endedAt: Date | null;
}

export class ProfileManagementService {
  constructor(private readonly repo: ProfileManagementRepository) {}

  // === Permisos UI ===

  public async getAllPermissions(): Promise<PermissionDto[]> {
    const perms = await this.repo.getAllPermissions();
    return perms.map(this.mapPermissionRow);
  }

  // === Perfiles ===

  public async getAllProfiles(branchId: string): Promise<ProfileDto[]> {
    const rows: ProfileWithPermissionsRow[] =
      await this.repo.getAllProfilesWithPermissions(branchId);

    const byProfile = new Map<string, ProfileDto>();

    for (const row of rows) {
      let profile = byProfile.get(row.profile_id);
      if (!profile) {
        profile = {
          id: row.profile_id,
          branchId: row.branch_id,
          name: row.profile_name,
          description: row.profile_description,
          isDefault: row.is_default,
          permissions: [],
        };
        byProfile.set(row.profile_id, profile);
      }

      if (row.permission_id) {
        profile.permissions.push({
          id: row.permission_id,
          code: row.permission_code!,
          name: row.permission_name!,
          description: row.permission_description,
        });
      }
    }

    return Array.from(byProfile.values());
  }

  public async getProfile(id: string): Promise<ProfileDto | null> {
    const base: UserProfileRow | null = await this.repo.getProfileById(id);
    if (!base) {
      return null;
    }

    const perms: UiPermissionRow[] = await this.repo.getProfilePermissions(id);

    return {
      id: base.id,
      branchId: base.branch_id,
      name: base.name,
      description: base.description,
      isDefault: base.is_default,
      permissions: perms.map(this.mapPermissionRow),
    };
  }

  public async createProfile(input: CreateProfileInput): Promise<ProfileDto> {
    if (!input.name || !input.name.trim()) {
      const err: any = new Error('PROFILE_NAME_REQUIRED');
      err.status = 400;
      throw err;
    }

    const profile = await this.repo.createProfile(input);
    const perms = await this.repo.getProfilePermissions(profile.id);

    return {
      id: profile.id,
      branchId: profile.branch_id,
      name: profile.name,
      description: profile.description,
      isDefault: profile.is_default,
      permissions: perms.map(this.mapPermissionRow),
    };
  }

  public async updateProfile(
    id: string,
    input: UpdateProfileInput
  ): Promise<ProfileDto> {
    const updated = await this.repo.updateProfile(id, input);
    if (!updated) {
      const err: any = new Error('PROFILE_NOT_FOUND');
      err.status = 404;
      throw err;
    }

    const perms = await this.repo.getProfilePermissions(id);

    return {
      id: updated.id,
      branchId: updated.branch_id,
      name: updated.name,
      description: updated.description,
      isDefault: updated.is_default,
      permissions: perms.map(this.mapPermissionRow),
    };
  }

  public async deleteProfile(id: string): Promise<void> {
    await this.repo.deleteProfile(id);
  }

  // === Asignación a STAFF ===

  public async getUserProfiles(
    userId: string
  ): Promise<UserProfileAssignmentDto[]> {
    const rows = await this.repo.getUserProfiles(userId);
    return rows.map(this.mapAssignmentRow);
  }

  public async assignProfileToUser(
    userId: string,
    profileId: string
  ): Promise<UserProfileAssignmentDto> {
    const isStaff = await this.repo.isStaffUser(userId);
    if (!isStaff) {
      const err: any = new Error('USER_IS_NOT_STAFF');
      err.status = 400;
      throw err;
    }

    const assignment: AppUserProfileRow =
      await this.repo.assignProfileToUser(userId, profileId);

    // Reutilizamos el mapper usando un objeto sintético
    const row: UserProfileAssignmentRow = {
      assignment_id: assignment.id,
      user_id: assignment.user_id,
      profile_id: assignment.profile_id,
      profile_name: '', // si quieres, puedes hacer otro SELECT para llenar esto
      branch_id: assignment.branch_id,
      active: assignment.active,
      created_at: assignment.created_at,
      ended_at: assignment.ended_at,
    };

    return this.mapAssignmentRow(row);
  }

  public async deactivateAssignment(
    assignmentId: string
  ): Promise<void> {
    await this.repo.deactivateAssignment(assignmentId);
  }

  // === Mappers internos ===

  private mapPermissionRow = (row: UiPermissionRow): PermissionDto => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
  });

  private mapAssignmentRow = (
    row: UserProfileAssignmentRow
  ): UserProfileAssignmentDto => ({
    assignmentId: row.assignment_id,
    userId: row.user_id,
    profileId: row.profile_id,
    profileName: row.profile_name,
    branchId: row.branch_id,
    active: row.active,
    createdAt: new Date(row.created_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
  });
}

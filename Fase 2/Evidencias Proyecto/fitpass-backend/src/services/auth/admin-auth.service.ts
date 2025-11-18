// src/services/auth/admin-auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PgUserRepository } from '../../repositories/user/user.repository';
import {
  PgStaffAccessRepository,
  StaffRoleRow,
  StaffProfileRow,
  ProfilePermissionRow,
} from '../../repositories/auth/staff-access.repository';

export interface AdminLoginInput {
  emailOrRut: string;
  password: string;
}

export class AdminAuthService {
  constructor(
    private readonly userRepo: PgUserRepository,
    private readonly staffAccessRepo: PgStaffAccessRepository,
  ) {}

  public async login(
    input: AdminLoginInput,
  ): Promise<{ token: string }> {
    const { emailOrRut, password } = input;

    // 1) Usuario
    const user = await this.userRepo.findByEmailOrRut(emailOrRut, emailOrRut);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 2) Password
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 3) Cargar roles STAFF
    const allRoles: StaffRoleRow[] =
      await this.staffAccessRepo.findRolesByUserId(user.id);

    const staffRoles = allRoles.filter((r) => r.role_kind === 'STAFF');
    if (staffRoles.length === 0) {
      // no es staff → no puede entrar al backoffice
      throw new Error('NOT_STAFF');
    }

    // 4) Cargar perfiles + permisos
    const profiles: StaffProfileRow[] =
      await this.staffAccessRepo.findProfilesByUserId(user.id);

    const profileIds = Array.from(
      new Set(profiles.map((p) => p.profile_id)),
    );

    const permissions: ProfilePermissionRow[] =
      await this.staffAccessRepo.findPermissionsByProfileIds(profileIds);

    // 4.1) Armar view de permisos por perfil
    const profilesWithPermissions = profiles.map((p) => ({
      profileId: p.profile_id,
      profileName: p.profile_name,
      profileDescription: p.profile_description,
      branch: p.branch_id
        ? {
            id: p.branch_id,
            code: p.branch_code,
            name: p.branch_name,
          }
        : null,
      permissions: permissions
        .filter((perm) => perm.profile_id === p.profile_id)
        .map((perm) => ({
          code: perm.permission_code,
          name: perm.permission_name,
          canView: perm.can_view,
          canEdit: perm.can_edit,
        })),
    }));

    // 5) Sucursales a las que tiene acceso como staff (por roles)
    const branchesMap = new Map<
      string,
      { id: string; code: string | null; name: string | null }
    >();

    staffRoles.forEach((r) => {
      if (!r.branch_id) return;
      if (!branchesMap.has(r.branch_id)) {
        branchesMap.set(r.branch_id, {
          id: r.branch_id,
          code: r.branch_code,
          name: r.branch_name,
        });
      }
    });

    const branches = Array.from(branchesMap.values());

    const rolesView = staffRoles.map((r) => ({
      branchId: r.branch_id,
      branchCode: r.branch_code,
      branchName: r.branch_name,
      roleId: r.role_id,
      roleCode: r.role_code,
      roleName: r.role_name,
    }));

    // 6) JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET_NOT_CONFIGURED');

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 4; // 4h de sesión backoffice

    const payload = {
      sub: user.id,
      iat,
      exp,

      // Flag claro para front
      isStaff: true,

      user: {
        id: user.id,
        email: user.email,
        rut: user.rut,
        firstName: user.first_name,
        lastName: user.last_name,
        secondLastName: user.second_last_name,
        middleName: user.middle_name,
        phone: user.phone,
        accessStatus: user.access_status,
        status: user.status,
      },

      // Sucursales donde tiene algún rol STAFF
      branches,

      // Roles STAFF por sucursal
      roles: rolesView,

      // Perfiles + permisos
      profiles: profilesWithPermissions,
    };

    const token = jwt.sign(payload, jwtSecret);
    return { token };
  }
}

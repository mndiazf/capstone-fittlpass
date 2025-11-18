// src/seeds/staff/branch-admins.seed.ts
import { query } from '../../config/db';
import { logger } from '../../utils/logger';

interface BranchAdminSeed {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  rut: string;
  phone: string | null;
  branchId: string;
}

// 👉 IDs fijos para rol y perfil temporal
const BRANCH_ADMIN_ROLE_ID = 'role-branch-admin';
const BRANCH_ADMIN_ROLE_CODE = 'BRANCH_ADMIN';

const BRANCH_ADMIN_PROFILE_ID = 'profile-branch-admin-temp';
const BRANCH_ADMIN_PROFILE_NAME = 'BRANCH_ADMIN_TEMP';

// ⚠️ Contraseña hash temporal (ajusta cuando tengas auth real)
const TEMP_PASSWORD_HASH = '$2a$12$yFMseVnsQPRbtW5EMYSYg.6rimVqeHnp9pnSK9zuE1MPSoYRbaFjS';

const admins: BranchAdminSeed[] = [
  {
    userId: 'user-admin-scl-centro',
    email: 'admin.centro@fitpass.cl',
    firstName: 'Admin',
    lastName: 'Santiago Centro',
    rut: '11.111.111-1',
    phone: '+56911111111',
    branchId: 'branch-scl-centro',
  },
  {
    userId: 'user-admin-scl-maipu',
    email: 'admin.maipu@fitpass.cl',
    firstName: 'Admin',
    lastName: 'Maipú',
    rut: '22.222.222-2',
    phone: '+56922222222',
    branchId: 'branch-scl-maipu',
  },
  {
    userId: 'user-admin-scl-lascondes',
    email: 'admin.lascondes@fitpass.cl',
    firstName: 'Admin',
    lastName: 'Las Condes',
    rut: '33.333.333-3',
    phone: '+56933333333',
    branchId: 'branch-scl-lascondes',
  },
  {
    userId: 'user-admin-scl-nunoa',
    email: 'admin.nunoa@fitpass.cl',
    firstName: 'Admin',
    lastName: 'Ñuñoa',
    rut: '44.444.444-4',
    phone: '+56944444444',
    branchId: 'branch-scl-nunoa',
  },
];

export const seedBranchAdmins = async (): Promise<void> => {
  logger.info('🌱 Seed: branch admins (staff)');

  // 1) Rol BRANCH_ADMIN (STAFF)
  await query(
    `
    INSERT INTO public.user_role (
      id, code, name, description, role_kind, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (code) DO UPDATE
    SET name        = EXCLUDED.name,
        description = EXCLUDED.description,
        role_kind   = EXCLUDED.role_kind,
        updated_at  = NOW();
    `,
    [
      BRANCH_ADMIN_ROLE_ID,
      BRANCH_ADMIN_ROLE_CODE,
      'Administrador de Sucursal',
      'Rol de staff administrador de una sucursal FitPass',
      'STAFF',
    ],
  );

  // 2) Perfil temporal BRANCH_ADMIN_TEMP
  await query(
    `
    INSERT INTO public.user_profile (
      id, "name", description, is_default, created_at, updated_at
    )
    VALUES ($1, $2, $3, false, NOW(), NOW())
    ON CONFLICT ("name") DO UPDATE
    SET description = EXCLUDED.description,
        updated_at  = NOW();
    `,
    [
      BRANCH_ADMIN_PROFILE_ID,
      BRANCH_ADMIN_PROFILE_NAME,
      'Perfil temporal para administradores de sucursal (ajustar permisos luego)',
    ],
  );

  // 3) Por cada sucursal/admin
  let templateIndex = 1;

  for (const admin of admins) {
    // 3.1) Usuario base en app_user
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
        'ACTIVO',
        NOW(),
        $2,
        $3,
        $4,
        NULL,
        $5,
        $6,
        $7,
        NULL,
        'ACTIVE',
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET email         = EXCLUDED.email,
          first_name    = EXCLUDED.first_name,
          last_name     = EXCLUDED.last_name,
          phone         = EXCLUDED.phone,
          status        = EXCLUDED.status,
          access_status = EXCLUDED.access_status,
          updated_at    = NOW();
      `,
      [
        admin.userId,
        admin.email,
        admin.firstName,
        admin.lastName,
        TEMP_PASSWORD_HASH,
        admin.phone,
        admin.rut,
      ],
    );

    // 3.2) Relación user_role (BRANCH_ADMIN en esa sucursal)
    const appUserRoleId = `aur-${templateIndex}`;
    await query(
      `
      INSERT INTO public.app_user_role (
        id, user_id, role_id, branch_id, active, created_at, ended_at
      )
      VALUES ($1, $2, $3, $4, true, NOW(), NULL)
      ON CONFLICT (user_id, role_id, branch_id) DO UPDATE
      SET active   = true,
          ended_at = NULL;
      `,
      [appUserRoleId, admin.userId, BRANCH_ADMIN_ROLE_ID, admin.branchId],
    );

    // 3.3) Relación user_profile (perfil temporal para esa sucursal)
    const appUserProfileId = `aup-${templateIndex}`;
    await query(
      `
      INSERT INTO public.app_user_profile (
        id, user_id, profile_id, branch_id, active, created_at, ended_at
      )
      VALUES ($1, $2, $3, $4, true, NOW(), NULL)
      ON CONFLICT (user_id, profile_id, branch_id) DO UPDATE
      SET active   = true,
          ended_at = NULL;
      `,
      [appUserProfileId, admin.userId, BRANCH_ADMIN_PROFILE_ID, admin.branchId],
    );

    // 3.4) Plantilla de acceso 24/7 para BRANCH_ADMIN en esta sucursal
    const templateId = `rat-admin-${templateIndex}`;
    const templateName = 'BRANCH_ADMIN_24_7';

    await query(
      `
      INSERT INTO public.role_access_template (
        id, role_id, branch_id, "name", is_default, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      ON CONFLICT (role_id, branch_id, "name") DO UPDATE
      SET is_default = EXCLUDED.is_default,
          updated_at = NOW();
      `,
      [templateId, BRANCH_ADMIN_ROLE_ID, admin.branchId, templateName],
    );

    // 3.5) Slots 24/7 (7 días x 24 horas)
    for (let day = 1; day <= 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const slotId = `ras-admin-${templateIndex}-${day}-${hour}`;
        await query(
          `
          INSERT INTO public.role_access_slot (
            id, template_id, day_of_week, "hour", allow
          )
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (template_id, day_of_week, "hour") DO UPDATE
          SET allow = true;
          `,
          [slotId, templateId, day, hour],
        );
      }
    }

    // 3.6) Asignación de plantilla de acceso al admin (activo desde hoy, sin fin)
    const assignmentId = `uaa-admin-${templateIndex}`;
    await query(
      `
      INSERT INTO public.user_access_assignment (
        id, user_id, template_id, valid_from, valid_to, is_active
      )
      VALUES ($1, $2, $3, CURRENT_DATE, NULL, true)
      ON CONFLICT (user_id, template_id, valid_from) DO UPDATE
      SET is_active = true,
          valid_to  = NULL;
      `,
      [assignmentId, admin.userId, templateId],
    );

    templateIndex++;
  }

  logger.info(`✅ Seed branch admins ok (${admins.length} admins con acceso 24/7)`);
};

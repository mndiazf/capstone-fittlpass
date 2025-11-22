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

// 👉 Nombre del perfil de administrador creado en seedUserProfiles
const BRANCH_ADMIN_PROFILE_NAME = 'Administrador de Sucursal';

// ⚠️ Contraseña hash temporal (ajusta cuando tengas auth real)
const TEMP_PASSWORD_HASH =
  '$2a$12$yFMseVnsQPRbtW5EMYSYg.6rimVqeHnp9pnSK9zuE1MPSoYRbaFjS';

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

  for (const admin of admins) {
    // 1) Usuario base en app_user (estos SÍ tienen contraseña)
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
          password_hash = EXCLUDED.password_hash,
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

    // 2) Buscar el perfil "Administrador de Sucursal" de esa sucursal
    const profileRes = await query<{ id: string }>(
      `
      SELECT id
      FROM public.user_profile
      WHERE branch_id = $1
        AND "name" = $2;
      `,
      [admin.branchId, BRANCH_ADMIN_PROFILE_NAME],
    );

    if (profileRes.rows.length === 0) {
      throw new Error(
        `ADMIN_PROFILE_NOT_FOUND: no existe perfil "${BRANCH_ADMIN_PROFILE_NAME}" para branch_id=${admin.branchId}. ` +
          'Asegúrate de ejecutar primero seedUserProfiles().',
      );
    }

    const profileId = profileRes.rows[0].id;

    // 3) Relación app_user_profile (asignar el perfil admin de esa sucursal)
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
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        true,
        NOW(),
        NULL
      )
      ON CONFLICT (user_id, profile_id, branch_id) DO UPDATE
      SET active   = true,
          ended_at = NULL;
      `,
      [admin.userId, profileId, admin.branchId],
    );
  }

  logger.info(
    `✅ Seed branch admins ok (${admins.length} admins con perfil "Administrador de Sucursal")`,
  );
};

// src/seeds/admin/user-profiles.seed.ts
import { randomUUID } from 'crypto';
import { query } from '../../config/db';
import { logger } from '../../utils/logger';

interface BranchRow {
  id: string;
  code: string;
  name: string;
}

interface PermissionRow {
  id: string;
  code: string;
}

type ProfileKey =
  | 'ADMIN'
  | 'RECEPTIONIST'
  | 'PERSONAL_TRAINER'
  | 'CLASS_INSTRUCTOR'
  | 'CLEANING';

interface ProfileSeedDef {
  key: ProfileKey;
  name: string;
  description: string;
  isDefault: boolean;
  permissionCodes: string[];
}

// 🔐 lista completa de permisos (tal como en ui-permissions.seed)
const ALL_PERMS: string[] = [
  'dashboard',
  'members',
  'enrollment',
  'member-search',
  'salesandpayment',
  'presential-sale',
  'reports',
  'access-report',
  'management',
  'management-users',
  'management-profiles',
  'management-staff-schedule',
  'management-branch-schedule',
];

// 🎭 definición de perfiles por sucursal
const PROFILE_DEFS: ProfileSeedDef[] = [
  {
    key: 'ADMIN',
    name: 'Administrador de Sucursal',
    description:
      'Acceso completo a todos los módulos del sistema para la sucursal.',
    isDefault: false,
    permissionCodes: ALL_PERMS,
  },
  {
    key: 'RECEPTIONIST',
    name: 'Recepcionista',
    description:
      'Gestiona miembros, enrolamiento facial y ventas presenciales.',
    isDefault: true,
    permissionCodes: [
      'dashboard',
      'members',
      'member-search',
      'enrollment',
      'salesandpayment',
      'presential-sale',
      'access-report',
    ],
  },
  {
    key: 'PERSONAL_TRAINER',
    name: 'Personal Trainer',
    description:
      'Consulta información de miembros para su seguimiento.',
    isDefault: false,
    permissionCodes: [],
  },
  {
    key: 'CLASS_INSTRUCTOR',
    name: 'Profesor de Clases',
    description:
      'Revisa información básica de miembros asociados a clases.',
    isDefault: false,
    permissionCodes: [],
  },
  {
    key: 'CLEANING',
    name: 'Personal de Aseo',
    description:
      'No requiere acceso a backoffice; se usa sólo para control de accesos.',
    isDefault: false,
    permissionCodes: [],
  },
];

export const seedUserProfiles = async (): Promise<void> => {
  logger.info('🌱 Seed: user_profile + user_profile_permission (perfiles staff)');

  // 1) Traer sucursales
  const branchesRes = await query<BranchRow>(
    `SELECT id, code, "name" FROM public.branch ORDER BY code ASC;`,
  );
  const branches = branchesRes.rows;

  if (branches.length === 0) {
    logger.warn('⚠️ No hay sucursales para crear perfiles.');
    return;
  }

  // 2) Traer permisos y mapear por code
  const permsRes = await query<PermissionRow>(
    `SELECT id, code FROM public.ui_permission;`,
  );
  const permMap = new Map<string, string>();
  for (const p of permsRes.rows) {
    permMap.set(p.code, p.id);
  }

  // 3) Crear/actualizar perfiles por sucursal
  for (const branch of branches) {
    logger.info(`  ➜ Creando perfiles para sucursal ${branch.code}`);

    for (const def of PROFILE_DEFS) {
      // 3.1) Ver si ya existe el perfil en esta sucursal
      const existingRes = await query<{ id: string }>(
        `
        SELECT id
        FROM public.user_profile
        WHERE branch_id = $1
          AND "name" = $2;
        `,
        [branch.id, def.name],
      );

      let profileId: string;

      if (existingRes.rows.length > 0) {
        // Ya existe → actualizamos metadatos
        profileId = existingRes.rows[0].id;
        await query(
          `
          UPDATE public.user_profile
          SET description = $2,
              is_default = $3,
              updated_at = NOW()
          WHERE id = $1;
          `,
          [profileId, def.description, def.isDefault],
        );
      } else {
        // No existe → lo creamos
        profileId = randomUUID();
        await query(
          `
          INSERT INTO public.user_profile (
            id, branch_id, "name", description, is_default, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW());
          `,
          [
            profileId,
            branch.id,
            def.name,
            def.description,
            def.isDefault,
          ],
        );
      }

      // 3.2) Enlazar permisos del perfil
      for (const code of def.permissionCodes) {
        const permId = permMap.get(code);
        if (!permId) {
          logger.warn(
            `    ⚠️ Permiso code="${code}" no existe en ui_permission (revisa ui-permissions.seed.ts)`,
          );
          continue;
        }

        await query(
          `
          INSERT INTO public.user_profile_permission (profile_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT (profile_id, permission_id) DO NOTHING;
          `,
          [profileId, permId],
        );
      }
    }
  }

  logger.info('✅ Seed perfiles staff ok (user_profile + user_profile_permission)');
};

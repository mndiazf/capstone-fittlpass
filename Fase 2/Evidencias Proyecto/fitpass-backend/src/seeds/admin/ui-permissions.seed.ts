// src/seeds/admin/ui-permissions.seed.ts
import { query } from '../../config/db';
import { logger } from '../../utils/logger';

interface UiPermissionSeed {
  id: string;
  code: string;
  name: string;
  description: string;
}

const uiPermissions: UiPermissionSeed[] = [
  // ===== Dashboard =====
  {
    id: 'perm-dashboard',
    code: 'dashboard',
    name: 'Dashboard',
    description: 'Acceso al panel principal del sistema.',
  },

  // ===== Miembros =====
  {
    id: 'perm-members',
    code: 'members',
    name: 'Miembros',
    description: 'Acceso al módulo de gestión de miembros.',
  },
  {
    id: 'perm-enrollment',
    code: 'enrollment',
    name: 'Enrolamiento facial',
    description: 'Registrar rostros de miembros para acceso facial.',
  },
  {
    id: 'perm-member-search',
    code: 'member-search',
    name: 'Buscar Miembro',
    description: 'Buscar y consultar información de miembros.',
  },
  // ===== Ventas y pagos =====
  {
    id: 'perm-salesandpayment',
    code: 'salesandpayment',
    name: 'Ventas y Pagos',
    description: 'Acceso al módulo de ventas y pagos.',
  },
  {
    id: 'perm-presential-sale',
    code: 'presential-sale',
    name: 'Venta Presencial',
    description: 'Realizar ventas presenciales en el gimnasio.',
  },

  // ===== Reportes =====
  {
    id: 'perm-reports',
    code: 'reports',
    name: 'Reportes',
    description: 'Acceso al módulo de reportes y analíticas.',
  },
  {
    id: 'perm-access-report',
    code: 'access-report',
    name: 'Reporte de Accesos',
    description: 'Ver y exportar registros de acceso al gimnasio.',
  },

  // ===== Mantenedores =====
  {
    id: 'perm-management',
    code: 'management',
    name: 'Mantenedores',
    description: 'Acceso al módulo de administración y configuración.',
  },
  {
    id: 'perm-management-users',
    code: 'management-users',
    name: 'Mantenedor de Usuarios',
    description: 'Crear, editar y eliminar usuarios del sistema.',
  },
  {
    id: 'perm-management-profiles',
    code: 'management-profiles',
    name: 'Mantenedor de Perfiles',
    description: 'Configurar perfiles de staff y sus permisos.',
  },
  {
    id: 'perm-management-staff-schedule',
    code: 'management-staff-schedule',
    name: 'Mantenedor de Horarios de Staff',
    description: 'Gestionar horarios del personal de la sucursal.',
  },
  {
    id: 'perm-management-branch-schedule',
    code: 'management-branch-schedule',
    name: 'Horarios de Sucursal',
    description: 'Configurar horarios de apertura y cierre de sucursales.',
  },
];

export const seedUiPermissions = async (): Promise<void> => {
  logger.info('🌱 Seed: ui_permission');

  for (const p of uiPermissions) {
    await query(
      `
      INSERT INTO public.ui_permission (id, code, "name", description)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (code) DO UPDATE
      SET "name" = EXCLUDED."name",
          description = EXCLUDED.description;
      `,
      [p.id, p.code, p.name, p.description],
    );
  }

  logger.info(`✅ Seed ui_permission ok (${uiPermissions.length} permisos)`);
};

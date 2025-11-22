// src/seeds/index.ts
import 'dotenv/config';

import { closePool } from '../config/db';
import { logger } from '../utils/logger';
import { seedBranches } from './branches/branches.seed';
import { seedMembershipPlans } from './membership/membership-plans.seed';
import { seedBranchAdmins } from './staff/branch-admins.seed';
import { seedUiPermissions } from './admin/ui-permissions.seed';
import { seedUserProfiles } from './admin/user-profiles.seed';

const runSeeds = async (): Promise<void> => {
  try {
    logger.info('🚜 Iniciando seeds FitPass...');

    // 1) Sucursales
    await seedBranches();

    // 2) Planes de membresía
    await seedMembershipPlans();

    // 3) Permisos de UI
    await seedUiPermissions();

    // 4) Perfiles por sucursal (ADMIN, Recepcionista, etc.)
    await seedUserProfiles();          // 👈 ESTE VA ANTES DE los admins

    // 5) Admins por sucursal (usan el perfil "Administrador de Sucursal")
    await seedBranchAdmins();

    logger.info('🎉 Seeds completados');
  } catch (err) {
    logger.error('❌ Error ejecutando seeds', err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
};

runSeeds();

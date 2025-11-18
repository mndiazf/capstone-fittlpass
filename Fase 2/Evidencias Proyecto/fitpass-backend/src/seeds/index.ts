// src/seeds/index.ts
import 'dotenv/config';

import { closePool } from '../config/db';
import { logger } from '../utils/logger';
import { seedBranches } from './branches/branches.seed';
import { seedMembershipPlans } from './membership/membership-plans.seed';
import { seedBranchAdmins } from './staff/branch-admins.seed';

const runSeeds = async (): Promise<void> => {
  try {
    logger.info('🚜 Iniciando seeds FitPass...');

    // 1) Sucursales
    await seedBranches();

    // 2) Planes de membresía (incluyen reglas de uso en las columnas)
    await seedMembershipPlans();

    // 3) Admins por sucursal (rol + perfil temporal + acceso 24/7)
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

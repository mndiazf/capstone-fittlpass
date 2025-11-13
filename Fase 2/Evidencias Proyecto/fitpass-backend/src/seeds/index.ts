import 'dotenv/config';
import { seedBranches } from './branches.seed';
import { seedMembershipPlans } from './membership-plans.seed';
import { closePool } from '../config/db';
import { logger } from '../utils/logger';

const runSeeds = async (): Promise<void> => {
  try {
    logger.info('🚜 Iniciando seeds FitPass...');

    // 1) Sucursales
    await seedBranches();

    // 2) Planes de membresía
    await seedMembershipPlans();

    logger.info('🎉 Seeds completados');
  } catch (err) {
    logger.error('❌ Error ejecutando seeds', err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
};

runSeeds();

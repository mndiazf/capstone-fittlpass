import { query } from "../../config/db";
import { logger } from "../../utils/logger";

interface BranchSeed {
  id: string;
  code: string;
  name: string;
  address: string | null;
  active: boolean;
}

const branches: BranchSeed[] = [
  {
    id: 'branch-scl-centro',
    code: 'FP-SCL-CENTRO',
    name: 'FitPass Santiago Centro',
    address: 'Alameda 1234, Santiago Centro',
    active: true,
  },
  {
    id: 'branch-scl-maipu',
    code: 'FP-SCL-MAIPU',
    name: 'FitPass Maipú',
    address: 'Av. Pajaritos 567, Maipú',
    active: true,
  },
  {
    id: 'branch-scl-lascondes',
    code: 'FP-SCL-LASCONDES',
    name: 'FitPass Las Condes',
    address: 'Av. Apoquindo 8900, Las Condes',
    active: true,
  },
  {
    id: 'branch-scl-nunoa',
    code: 'FP-SCL-NUNOA',
    name: 'FitPass Ñuñoa',
    address: 'Irarrázaval 3000, Ñuñoa',
    active: true,
  },
];

export const seedBranches = async (): Promise<void> => {
  logger.info('🌱 Seed: branches');

  for (const b of branches) {
    await query(
      `
      INSERT INTO public.branch (id, code, "name", address, active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (code) DO UPDATE
      SET "name" = EXCLUDED."name",
          address = EXCLUDED.address,
          active  = EXCLUDED.active;
      `,
      [b.id, b.code, b.name, b.address, b.active],
    );
  }

  logger.info(`✅ Seed branches ok (${branches.length} sucursales)`);
};

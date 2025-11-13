import { query } from '../config/db';
import { logger } from '../utils/logger';

type PeriodUnit = 'WEEK' | 'MONTH' | 'TOTAL';
type PlanScope = 'ONECLUB' | 'MULTICLUB';

interface MembershipPlanSeed {
  code: string;
  name: string;
  description: string;
  price: number;
  durationMonths: number;
  planScope: PlanScope;
  isUsageLimited: boolean;
  maxDaysPerPeriod?: number | null;
  periodUnit?: PeriodUnit | null;
  periodLength?: number | null;
}

const plans: MembershipPlanSeed[] = [
  // ==========================
  // Planes ilimitados
  // ==========================
  {
    code: 'MULTICLUB_ANUAL',
    name: 'Multiclub Anual',
    description: 'Acceso ilimitado a todas las sedes por 12 meses.',
    price: 299000,
    durationMonths: 12,
    planScope: 'MULTICLUB',
    isUsageLimited: false,
  },
  {
    code: 'ONECLUB_ANUAL',
    name: 'One Club Anual',
    description: 'Acceso ilimitado a una sede por 12 meses.',
    price: 239000,
    durationMonths: 12,
    planScope: 'ONECLUB',
    isUsageLimited: false,
  },
  {
    code: 'ONECLUB_MENSUAL',
    name: 'One Club Mensual',
    description: 'Acceso ilimitado a una sede por 1 mes.',
    price: 29000,
    durationMonths: 1,
    planScope: 'ONECLUB',
    isUsageLimited: false,
  },

  // ==========================
  // Plan trial 3 días en 1 semana
  // ==========================
  {
    code: 'TRIAL_3D_WEEK',
    name: 'Trial 3 Días',
    description: 'Hasta 3 asistencias dentro de una semana, en cualquier sede.',
    price: 0,
    durationMonths: 0, // trial corto
    planScope: 'MULTICLUB',
    isUsageLimited: true,
    maxDaysPerPeriod: 3,
    periodUnit: 'WEEK',
    periodLength: 1,
  },

  // ==========================
  // Plan limitado 5 días/semana por 6 meses
  // ==========================
  {
    code: 'LIMITED_5D_WEEK_6M',
    name: 'Plan 5 días por semana (6 meses)',
    description: 'Hasta 5 asistencias por semana durante 6 meses.',
    price: 149000,
    durationMonths: 6,
    planScope: 'MULTICLUB',
    isUsageLimited: true,
    maxDaysPerPeriod: 5,
    periodUnit: 'WEEK',
    periodLength: 1,
  },
];

export const seedMembershipPlans = async (): Promise<void> => {
  logger.info('🌱 Seed: membership_plan');

  for (const p of plans) {
    await query(
      `
      INSERT INTO public.membership_plan (
        code,
        name,
        description,
        price,
        duration_months,
        plan_scope,
        is_usage_limited,
        max_days_per_period,
        period_unit,
        period_length
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (code) DO UPDATE
      SET name                = EXCLUDED.name,
          description         = EXCLUDED.description,
          price               = EXCLUDED.price,
          duration_months     = EXCLUDED.duration_months,
          plan_scope          = EXCLUDED.plan_scope,
          is_usage_limited    = EXCLUDED.is_usage_limited,
          max_days_per_period = EXCLUDED.max_days_per_period,
          period_unit         = EXCLUDED.period_unit,
          period_length       = EXCLUDED.period_length;
      `,
      [
        p.code,
        p.name,
        p.description,
        p.price,
        p.durationMonths,
        p.planScope,
        p.isUsageLimited,
        p.maxDaysPerPeriod ?? null,
        p.periodUnit ?? null,
        p.periodLength ?? null,
      ],
    );
  }

  logger.info(`✅ Seed membership_plan ok (${plans.length} planes)`);
};

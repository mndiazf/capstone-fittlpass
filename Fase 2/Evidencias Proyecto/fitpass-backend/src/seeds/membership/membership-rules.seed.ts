import { query } from "../../config/db";
import { logger } from "../../utils/logger";

interface MembershipRuleSeed {
  id: string;
  membershipType: string;
  periodUnit: 'WEEK' | 'MONTH' | 'TOTAL';
  periodLength: number;
  maxDays: number;
}

const rules: MembershipRuleSeed[] = [
  // Trial: 3 días durante 1 semana
  {
    id: 'mur-trial-3d-week',
    membershipType: 'TRIAL_3D_WEEK',
    periodUnit: 'WEEK',
    periodLength: 1,
    maxDays: 3
  },

  // Membresía limitada 5 días/semana (vigencia 6 meses la define user_membership.start/end)
  {
    id: 'mur-limited-5d-week-6m',
    membershipType: 'LIMITED_5D_WEEK_6M',
    periodUnit: 'WEEK',
    periodLength: 1,
    maxDays: 5
  }

  // Si quisieras, más adelante podrías añadir aquí rules "unlimited"
  // con period_unit = 'TOTAL' y max_days muy alto.
];

export const seedMembershipRules = async (): Promise<void> => {
  logger.info('🌱 Seed: membership_usage_rule');

  for (const r of rules) {
    await query(
      `
      INSERT INTO public.membership_usage_rule (
        id, membership_type, period_unit, period_length, max_days
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (membership_type) DO UPDATE
      SET period_unit   = EXCLUDED.period_unit,
          period_length = EXCLUDED.period_length,
          max_days      = EXCLUDED.max_days;
      `,
      [r.id, r.membershipType, r.periodUnit, r.periodLength, r.maxDays]
    );
  }

  logger.info(`✅ Seed membership_usage_rule ok (${rules.length} reglas)`);
};

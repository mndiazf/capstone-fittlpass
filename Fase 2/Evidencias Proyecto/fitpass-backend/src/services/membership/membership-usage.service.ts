// src/services/membership/membership-usage.service.ts
import {
  MembershipPlan,
  PeriodUnit,
} from '../../repositories/membership/membership-plan.repository';
import {
  PgMembershipDayUsageRepository,
} from '../../repositories/membership/membership-day-usage.repository';

export interface MembershipUsageSummary {
  isUsageLimited: boolean;
  maxDaysPerPeriod: number | null;
  periodUnit: PeriodUnit | null;
  periodLength: number | null;
  usedDaysInCurrentPeriod: number;
  remainingDaysInCurrentPeriod: number;
  limitReached: boolean;
  message?: string;
}

export class MembershipUsageService {
  constructor(
    private readonly usageRepo: PgMembershipDayUsageRepository,
  ) {}

  /**
   * Construye el resumen de uso para una membresía limitada.
   * Si el plan no es limitado, devuelve null.
   */
  public async buildUsageForMembership(
    membershipId: string,
    plan: MembershipPlan,
  ): Promise<MembershipUsageSummary | null> {
    if (
      !plan.isUsageLimited ||
      !plan.maxDaysPerPeriod ||
      !plan.periodUnit ||
      !plan.periodLength
    ) {
      return null;
    }

    const usedDays = await this.usageRepo.countDistinctDaysInCurrentPeriod(
      membershipId,
      plan.periodUnit,
      plan.periodLength,
    );

    const max = plan.maxDaysPerPeriod;
    const remaining = Math.max(0, max - usedDays);
    const limitReached = usedDays >= max;

    return {
      isUsageLimited: true,
      maxDaysPerPeriod: max,
      periodUnit: plan.periodUnit,
      periodLength: plan.periodLength,
      usedDaysInCurrentPeriod: usedDays,
      remainingDaysInCurrentPeriod: remaining,
      limitReached,
      message: limitReached
        ? `Ya utilizaste todos los ${max} días disponibles de tu plan en este período.`
        : `Has usado ${usedDays} de ${max} días disponibles en este período.`,
    };
  }
}

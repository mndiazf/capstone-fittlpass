import { BranchRepository, BranchRow } from "../../repositories/branch/branch.repository";
import { IMembershipPlanRepository, MembershipPlan, MembershipPlanFilter } from "../../repositories/membership/membership-plan.repository";
import { logger } from "../../utils/logger";


export interface MembershipCatalogItem {
  code: string;
  name: string;
  description: string | null;
  price: number;
  durationMonths: number;
  scope: MembershipPlan['planScope'];
  isUsageLimited: boolean;
  maxDaysPerPeriod: number | null;
  periodUnit: MembershipPlan['periodUnit'];
  periodLength: number | null;
}

export interface BranchCatalogItem {
  id: string;
  code: string;
  name: string;
  address: string | null;
  active: boolean;
}

export interface ICatalogService {
  getMembershipCatalog(
    filter: MembershipPlanFilter
  ): Promise<MembershipCatalogItem[]>;

  getBranchesCatalog(): Promise<BranchCatalogItem[]>;
}

export class CatalogService implements ICatalogService {
  constructor(
    private readonly membershipPlanRepository: IMembershipPlanRepository,
  ) {}

  public async getMembershipCatalog(
    filter: MembershipPlanFilter,
  ): Promise<MembershipCatalogItem[]> {
    const plans = await this.membershipPlanRepository.find(filter);

    return plans.map((p) => ({
      code: p.code,
      name: p.name,
      description: p.description,
      price: p.price,
      durationMonths: p.durationMonths,
      scope: p.planScope,
      isUsageLimited: p.isUsageLimited,
      maxDaysPerPeriod: p.maxDaysPerPeriod,
      periodUnit: p.periodUnit,
      periodLength: p.periodLength,
    }));
  }

  // ===== Clubes (branches) =====
  public async getBranchesCatalog(): Promise<BranchCatalogItem[]> {
    logger.info('📦 Cargando catálogo de clubes (branches)');

    const branches: BranchRow[] = await BranchRepository.findAll();

    return branches.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      address: b.address,
      active: b.active,
    }));
  }
}

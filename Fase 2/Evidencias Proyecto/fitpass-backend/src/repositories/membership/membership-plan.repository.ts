// src/repositories/membership-plan.repository.ts
import { query } from '../../config/db';

export type PlanScope = 'ONECLUB' | 'MULTICLUB';
export type PeriodUnit = 'WEEK' | 'MONTH' | 'TOTAL';

export interface MembershipPlanRow {
  code: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  plan_scope: PlanScope;
  is_usage_limited: boolean;
  max_days_per_period: number | null;
  period_unit: string | null;
  period_length: number | null;
}

// Modelo de dominio que usará el servicio / controller
export interface MembershipPlan {
  code: string;
  name: string;
  description: string | null;
  price: number;
  durationMonths: number;
  planScope: PlanScope;
  isUsageLimited: boolean;
  maxDaysPerPeriod: number | null;
  periodUnit: PeriodUnit | null;
  periodLength: number | null;
}

export interface MembershipPlanFilter {
  scope?: PlanScope;
}

// === Interfaz del repositorio (para SOLID / DIP) ===
export interface IMembershipPlanRepository {
  find(filter: MembershipPlanFilter): Promise<MembershipPlan[]>;
  findByCode(code: string): Promise<MembershipPlan | null>;
}

// === Implementación concreta con PostgreSQL ===
export class PgMembershipPlanRepository implements IMembershipPlanRepository {
  private mapRow(row: MembershipPlanRow): MembershipPlan {
    return {
      code: row.code,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      durationMonths: row.duration_months,
      planScope: row.plan_scope,
      isUsageLimited: row.is_usage_limited,
      maxDaysPerPeriod: row.max_days_per_period,
      periodUnit: (row.period_unit as PeriodUnit | null) ?? null,
      periodLength: row.period_length,
    };
  }

  public async find(filter: MembershipPlanFilter): Promise<MembershipPlan[]> {
    const params: unknown[] = [];
    let sql = `
      SELECT
        code,
        "name",
        description,
        price,
        duration_months,
        plan_scope,
        is_usage_limited,
        max_days_per_period,
        period_unit,
        period_length
      FROM public.membership_plan mp
      WHERE 1 = 1
    `;

    if (filter.scope) {
      params.push(filter.scope);
      sql += ` AND mp.plan_scope = $${params.length}`;
    }

    sql += ' ORDER BY price ASC';

    const result = await query<MembershipPlanRow>(sql, params);
    return result.rows.map((r) => this.mapRow(r));
  }

  public async findByCode(code: string): Promise<MembershipPlan | null> {
    const result = await query<MembershipPlanRow>(
      `
      SELECT
        code,
        "name",
        description,
        price,
        duration_months,
        plan_scope,
        is_usage_limited,
        max_days_per_period,
        period_unit,
        period_length
      FROM public.membership_plan
      WHERE code = $1
      LIMIT 1
      `,
      [code],
    );

    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }
}

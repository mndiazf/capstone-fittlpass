// src/repositories/checkout.repository.ts
import { query } from '../config/db';

export type PlanScope = 'ONECLUB' | 'MULTICLUB';

export interface AppUserRow {
  id: string;
  access_status: string;
  created_at: Date;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  password_hash: string;
  phone: string | null;
  rut: string;
  second_last_name: string | null;
  status: string | null;
  updated_at: Date;
}

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

export interface UserMembershipRow {
  id: string;
  plan_code: string;
  user_id: string;
  branch_id: string | null;
  start_date: string; // date
  end_date: string;   // date
  status: string;
}

export interface MembershipPaymentRow {
  id: string;
  membership_id: string;
  user_id: string;
  amount: number;
  currency: string;
  paid_at: Date;
  card_type: string | null;
  card_brand: string | null;
  card_last4: string | null;
}

export interface CreateUserInput {
  id: string;
  accessStatus: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone?: string | null;
  rut: string;
  secondLastName?: string | null;
  status?: string | null;
  passwordHash: string;
}

export interface CreateMembershipInput {
  id: string;
  planCode: string;
  userId: string;
  branchId: string | null;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  status: string;    // 'ACTIVE'
}

export interface CreatePaymentInput {
  id: string;
  membershipId: string;
  userId: string;
  amount: number;
  currency: string;
  cardType: string;
  cardBrand: string;
  cardLast4: string | null;
}

export const CheckoutRepository = {
  async findUserByEmailOrRut(email: string, rut: string): Promise<AppUserRow | null> {
    const result = await query<AppUserRow>(
      `
      SELECT *
      FROM public.app_user
      WHERE email = $1 OR rut = $2
      LIMIT 1;
      `,
      [email, rut],
    );

    return result.rows[0] ?? null;
  },

  async findPlanByCode(planCode: string): Promise<MembershipPlanRow | null> {
    const result = await query<MembershipPlanRow>(
      `
      SELECT *
      FROM public.membership_plan
      WHERE code = $1;
      `,
      [planCode],
    );

    return result.rows[0] ?? null;
  },

  async findMembershipByUserId(userId: string): Promise<UserMembershipRow | null> {
    const result = await query<UserMembershipRow>(
      `
      SELECT *
      FROM public.user_membership
      WHERE user_id = $1
      LIMIT 1;
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  },

  async createUser(input: CreateUserInput): Promise<AppUserRow> {
    const result = await query<AppUserRow>(
      `
      INSERT INTO public.app_user (
        id,
        access_status,
        created_at,
        email,
        first_name,
        last_name,
        middle_name,
        password_hash,
        phone,
        rut,
        second_last_name,
        status,
        updated_at
      )
      VALUES (
        $1, $2, NOW(), $3, $4, $5, $6,
        $7, $8, $9, $10, $11, NOW()
      )
      RETURNING *;
      `,
      [
        input.id,
        input.accessStatus,
        input.email,
        input.firstName,
        input.lastName,
        input.middleName ?? null,
        input.passwordHash,
        input.phone ?? null,
        input.rut,
        input.secondLastName ?? null,
        input.status ?? null,
      ],
    );

    return result.rows[0];
  },

  async createMembership(input: CreateMembershipInput): Promise<UserMembershipRow> {
    const result = await query<UserMembershipRow>(
      `
      INSERT INTO public.user_membership (
        id,
        plan_code,
        user_id,
        branch_id,
        start_date,
        end_date,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
      `,
      [
        input.id,
        input.planCode,
        input.userId,
        input.branchId,
        input.startDate,
        input.endDate,
        input.status,
      ],
    );

    return result.rows[0];
  },

  async createPayment(input: CreatePaymentInput): Promise<MembershipPaymentRow> {
    const result = await query<MembershipPaymentRow>(
      `
      INSERT INTO public.membership_payment (
        id,
        membership_id,
        user_id,
        amount,
        currency,
        paid_at,
        card_type,
        card_brand,
        card_last4
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
      RETURNING *;
      `,
      [
        input.id,
        input.membershipId,
        input.userId,
        input.amount,
        input.currency,
        input.cardType,
        input.cardBrand,
        input.cardLast4,
      ],
    );

    return result.rows[0];
  },
};

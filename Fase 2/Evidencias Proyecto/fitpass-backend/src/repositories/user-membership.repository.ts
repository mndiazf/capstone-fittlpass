// src/repositories/user-membership.repository.ts
import { query } from '../config/db';

export interface CreateUserMembershipInput {
  planCode: string;
  userId: string;
  branchId: string | null;
  startDate: Date;
  endDate: Date;
}

export interface UserMembershipRow {
  id: string;
  plan_code: string;
  user_id: string;
  branch_id: string | null;
  start_date: Date;
  end_date: Date;
  status: string;
}

export class PgUserMembershipRepository {
  public async create(input: CreateUserMembershipInput): Promise<UserMembershipRow> {
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
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        'ACTIVE'
      )
      RETURNING *
      `,
      [
        input.planCode,
        input.userId,
        input.branchId,
        input.startDate,
        input.endDate,
      ]
    );

    return result.rows[0];
  }

    // 👇 NUEVO: buscar membresía ACTIVA de un usuario
  public async findActiveByUserId(
    userId: string
  ): Promise<UserMembershipRow | null> {
    const result = await query<UserMembershipRow>(
      `
      SELECT *
      FROM public.user_membership
      WHERE user_id = $1
        AND status  = 'ACTIVE'
      ORDER BY end_date DESC
      LIMIT 1
      `,
      [userId]
    );

    return result.rows[0] ?? null;
  }
}

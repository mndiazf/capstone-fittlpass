// src/repositories/membership/user-membership.repository.ts
import { query } from '../../config/db';

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

export interface UserMembershipRowWithBranch extends UserMembershipRow {
  branch_name: string | null;
  branch_code: string | null;
}

export class PgUserMembershipRepository {
  public async create(
    input: CreateUserMembershipInput,
  ): Promise<UserMembershipRow> {
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
      ],
    );

    return result.rows[0];
  }

  // 👉 ahora devuelve también branch_name y branch_code
  public async findActiveByUserId(
    userId: string,
  ): Promise<UserMembershipRowWithBranch | null> {
    const result = await query<UserMembershipRowWithBranch>(
      `
      SELECT
        um.id,
        um.plan_code,
        um.user_id,
        um.branch_id,
        um.start_date,
        um.end_date,
        um.status,
        b.name AS branch_name,
        b.code AS branch_code
      FROM public.user_membership um
      LEFT JOIN public.branch b ON b.id = um.branch_id
      WHERE um.user_id = $1
        AND um.status  = 'ACTIVE'
      ORDER BY um.end_date DESC
      LIMIT 1;
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }
}

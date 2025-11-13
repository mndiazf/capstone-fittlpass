// src/repositories/membership-payment.repository.ts
import { query } from '../../config/db';

export interface CreateMembershipPaymentInput {
  membershipId: string;
  userId: string;
  amount: number;
  currency: string;
  cardLast4: string;
  cardType: string;
  cardBrand: string;
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

export class PgMembershipPaymentRepository {
  public async create(
    input: CreateMembershipPaymentInput,
  ): Promise<MembershipPaymentRow> {
    const now = new Date();

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
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
      RETURNING *
      `,
      [
        input.membershipId,
        input.userId,
        input.amount,
        input.currency,
        now,
        input.cardType,
        input.cardBrand,
        input.cardLast4,
      ],
    );

    return result.rows[0];
  }

    // 👇 NUEVO: último pago de una membresía
  public async findLastByMembershipId(
    membershipId: string
  ): Promise<MembershipPaymentRow | null> {
    const result = await query<MembershipPaymentRow>(
      `
      SELECT *
      FROM public.membership_payment
      WHERE membership_id = $1
      ORDER BY paid_at DESC
      LIMIT 1
      `,
      [membershipId]
    );

    return result.rows[0] ?? null;
  }
}

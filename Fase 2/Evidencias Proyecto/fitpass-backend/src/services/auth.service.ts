// src/services/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

import { PgUserRepository } from '../repositories/user.repository';
import {
  PgUserMembershipRepository,
  UserMembershipRow,
} from '../repositories/user-membership.repository';
import {
  PgMembershipPlanRepository,
  MembershipPlan,
} from '../repositories/membership-plan.repository';
import {
  PgMembershipPaymentRepository,
  MembershipPaymentRow,
} from '../repositories/membership-payment.repository';

export interface LoginInput {
  emailOrRut: string;
  password: string;
}

export class AuthService {
  constructor(
    private readonly userRepo: PgUserRepository,
    private readonly userMembershipRepo: PgUserMembershipRepository,
    private readonly planRepo: PgMembershipPlanRepository,
    private readonly membershipPaymentRepo: PgMembershipPaymentRepository,
  ) {}

  public async login(input: LoginInput): Promise<{ token: string }> {
    const { emailOrRut, password } = input;

    // 1) Buscar usuario por email o RUT
    const user = await this.userRepo.findByEmailOrRut(emailOrRut, emailOrRut);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 2) Validar password
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 3) Buscar membresía ACTIVA
    const membership: UserMembershipRow | null =
      await this.userMembershipRepo.findActiveByUserId(user.id);

    if (!membership) {
      throw new Error('ACTIVE_MEMBERSHIP_NOT_FOUND');
    }

    // 4) Plan de la membresía
    const plan: MembershipPlan | null = await this.planRepo.findByCode(
      membership.plan_code,
    );
    if (!plan) {
      throw new Error('PLAN_NOT_FOUND');
    }

    // 5) Último pago asociado a esa membresía (puede ser null)
    const payment: MembershipPaymentRow | null =
      await this.membershipPaymentRepo.findLastByMembershipId(membership.id);

    // 6) JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET_NOT_CONFIGURED');

    const tokenIssuedAt = Math.floor(Date.now() / 1000);
    const tokenExpiresAt = tokenIssuedAt + 60 * 60; // 1 hora

    const payload = {
      sub: user.id,

      // estándar JWT
      iat: tokenIssuedAt,
      exp: tokenExpiresAt,

      // extras útiles
      tokenIssuedAt,
      tokenExpiresAt,

      user: {
        id: user.id,
        email: user.email,
        rut: user.rut,
        firstName: user.first_name,
        lastName: user.last_name,
        secondLastName: user.second_last_name,
        middleName: user.middle_name,
        phone: user.phone,
        accessStatus: user.access_status,
        status: user.status,
      },

      membership: {
        id: membership.id,
        planCode: membership.plan_code,
        planName: plan.name,
        scope: plan.planScope,
        branchId: membership.branch_id,
        startDate: membership.start_date,
        endDate: membership.end_date,
        status: membership.status,
      },

      // Si no hay pago, va null (no debería pasar en flujo normal)
      payment: payment
        ? {
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            cardLast4: payment.card_last4,
            cardType: payment.card_type,
            cardBrand: payment.card_brand,
            paidAt: payment.paid_at,
          }
        : null,
    };

    const token = jwt.sign(payload, jwtSecret);

    return { token };
  }
}

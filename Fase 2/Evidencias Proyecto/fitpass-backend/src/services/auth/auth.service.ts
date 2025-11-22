// src/services/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { PgUserRepository } from '../../repositories/user/user.repository';
import {
  PgUserMembershipRepository,
  UserMembershipRowWithBranch,
} from '../../repositories/membership/user-membership.repository';
import {
  MembershipPlan,
  PgMembershipPlanRepository,
} from '../../repositories/membership/membership-plan.repository';
import {
  MembershipPaymentRow,
  PgMembershipPaymentRepository,
} from '../../repositories/membership/membership-payment.repository';
import {
  MembershipUsageService,
  MembershipUsageSummary,
} from '../membership/membership-usage.service';

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
    private readonly membershipUsageService: MembershipUsageService,
  ) {}

  public async login(input: LoginInput): Promise<{ token: string }> {
    const { emailOrRut, password } = input;

    // 1) Buscar usuario por email o RUT
    const user = await this.userRepo.findByEmailOrRut(emailOrRut, emailOrRut);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // ⚠️ Aquí puedes filtrar STAFF vs NO STAFF si quieres que este login
    // sólo funcione para miembros (no staff), p.ej. consultando app_user_profile.

    // 2) Validar password
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 3) Buscar membresía ACTIVA (incluyendo datos de sucursal)
    const membership: UserMembershipRowWithBranch | null =
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

    // 6) Uso de membresía limitada (TRIAL, etc.) desde membership_day_usage
    let membershipUsage: MembershipUsageSummary | null = null;
    if (plan.isUsageLimited) {
      membershipUsage =
        await this.membershipUsageService.buildUsageForMembership(
          membership.id,
          plan,
        );
    }

    // 7) JWT
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
        branchName: membership.branch_name,
        branchCode: membership.branch_code,
        startDate: membership.start_date,
        endDate: membership.end_date,
        status: membership.status,
        usage: membershipUsage, // 👈 resumen de uso (membership_day_usage)
      },

      // Si no hay pago, va null
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

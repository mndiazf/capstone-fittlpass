// src/services/checkout.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PgUserRepository } from '../../repositories/user/user.repository';
import { MembershipPlan, PgMembershipPlanRepository } from '../../repositories/membership/membership-plan.repository';
import { PgUserMembershipRepository } from '../../repositories/membership/user-membership.repository';
import { PgMembershipPaymentRepository } from '../../repositories/membership/membership-payment.repository';
import { logger } from '../../utils/logger';

export interface CheckoutUserInput {
  rut: string;
  email: string;
  firstName: string;
  lastName: string;
  secondLastName?: string;
  middleName?: string;
  phone?: string;
  password: string;
}

export interface CheckoutPaymentInput {
  amount: number;
  currency: string;
  cardLast4: string;
}

export interface CheckoutMembershipInput {
  planCode: string;
  branchId: string | null;
  user: CheckoutUserInput;
  payment: CheckoutPaymentInput;
}

export class CheckoutService {
  constructor(
    private readonly userRepo: PgUserRepository,
    private readonly planRepo: PgMembershipPlanRepository,
    private readonly userMembershipRepo: PgUserMembershipRepository,
    private readonly membershipPaymentRepo: PgMembershipPaymentRepository,
  ) {}

  public async checkoutMembership(
    input: CheckoutMembershipInput,
  ): Promise<{ token: string }> {
    const { planCode, branchId, user, payment } = input;

    // -------------------------------------------------------------
    // 1) Obtener plan
    // -------------------------------------------------------------
    const plan: MembershipPlan | null = await this.planRepo.findByCode(planCode);
    if (!plan) throw new Error('PLAN_NOT_FOUND');

    // Validación de scope
    if (plan.planScope === 'ONECLUB' && !branchId) {
      throw new Error('BRANCH_REQUIRED_FOR_ONECLUB');
    }

    // -------------------------------------------------------------
    // 2) Validar usuario existente
    // -------------------------------------------------------------
    const exists = await this.userRepo.findByEmailOrRut(user.email, user.rut);
    if (exists) throw new Error('USER_ALREADY_EXISTS');

    // -------------------------------------------------------------
    // 3) Crear usuario
    // -------------------------------------------------------------
    const passwordHash = await bcrypt.hash(user.password, 10);

    const createdUser = await this.userRepo.create({
      email: user.email,
      rut: user.rut,
      firstName: user.firstName,
      lastName: user.lastName,
      secondLastName: user.secondLastName ?? null,
      middleName: user.middleName ?? null,
      phone: user.phone ?? null,
      passwordHash,
    });

    // -------------------------------------------------------------
    // 4) Crear membresía
    // -------------------------------------------------------------
    const startDate = new Date();
    const endDate = new Date(startDate);

    if (plan.durationMonths > 0) {
      endDate.setMonth(endDate.getMonth() + plan.durationMonths);
    } else {
      // trial: 1 semana
      endDate.setDate(endDate.getDate() + 7);
    }

    const membership = await this.userMembershipRepo.create({
      planCode: plan.code,
      userId: createdUser.id,
      branchId,
      startDate,
      endDate,
    });

    // -------------------------------------------------------------
    // 5) Card brand y type aleatorios (sin UNKNOWN, sin AMEX)
    // -------------------------------------------------------------
    const cardTypes = ['CREDIT', 'DEBIT'] as const;
    const cardBrands = ['VISA', 'MASTERCARD'] as const; // 👈 solo estas dos

    const cardType =
      cardTypes[Math.floor(Math.random() * cardTypes.length)];
    const cardBrand =
      cardBrands[Math.floor(Math.random() * cardBrands.length)];

    logger.info(
      `Checkout - tarjeta generada aleatoriamente: type=${cardType}, brand=${cardBrand}`,
    );

    // -------------------------------------------------------------
    // 6) Registrar pago
    // -------------------------------------------------------------
    const paymentRow = await this.membershipPaymentRepo.create({
      membershipId: membership.id,
      userId: createdUser.id,
      amount: payment.amount,
      currency: payment.currency,
      cardLast4: payment.cardLast4,
      cardType,
      cardBrand,
    });

    // -------------------------------------------------------------
    // 7) JWT
    // -------------------------------------------------------------
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET_NOT_CONFIGURED');

    const tokenIssuedAt = Math.floor(Date.now() / 1000);
    const tokenExpiresAt = tokenIssuedAt + 60 * 60; // 1 hora

    const payload = {
      sub: createdUser.id,

      // estándar JWT
      iat: tokenIssuedAt,
      exp: tokenExpiresAt,

      // extras útiles dentro del token
      tokenIssuedAt,
      tokenExpiresAt,

      user: {
        id: createdUser.id,
        email: createdUser.email,
        rut: createdUser.rut,
        firstName: createdUser.first_name,
        lastName: createdUser.last_name,
        secondLastName: createdUser.second_last_name,
        middleName: createdUser.middle_name,
        phone: createdUser.phone,
        accessStatus: createdUser.access_status,
        status: createdUser.status,
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

      payment: {
        id: paymentRow.id,
        amount: paymentRow.amount,
        currency: paymentRow.currency,
        cardLast4: paymentRow.card_last4,
        cardType: paymentRow.card_type,
        cardBrand: paymentRow.card_brand,
        paidAt: paymentRow.paid_at,
      },
    };

    // Ya tenemos exp en el payload → NO usamos expiresIn
    const token = jwt.sign(payload, jwtSecret);

    return { token };
  }
}

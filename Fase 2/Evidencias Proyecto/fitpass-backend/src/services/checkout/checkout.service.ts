// src/services/checkout/checkout.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PgUserRepository, UserRow } from '../../repositories/user/user.repository';
import {
  MembershipPlan,
  PgMembershipPlanRepository,
} from '../../repositories/membership/membership-plan.repository';
import {
  PgUserMembershipRepository,
  UserMembershipRow,
} from '../../repositories/membership/user-membership.repository';
import {
  PgMembershipPaymentRepository,
  MembershipPaymentRow,
} from '../../repositories/membership/membership-payment.repository';
import { logger } from '../../utils/logger';
import { EmailService } from '../../utils/email.service';

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

export interface PresentialCheckoutUserInput {
  rut: string;
  email: string;
  firstName: string;
  lastName: string;
  secondLastName?: string;
  middleName?: string;
  phone?: string;
  // 👉 sin password, se genera en backend
}

export interface CheckoutPaymentInput {
  amount: number;
  currency: string;
  cardLast4: string;
}

export interface CheckoutMembershipInput {
  planCode: string;
  branchId: string | null; // ONECLUB → sucursal, MULTICLUB → null
  user: CheckoutUserInput;
  payment: CheckoutPaymentInput;
}

export interface PresentialCheckoutMembershipInput {
  planCode: string;
  branchId: string; // sucursal donde se realiza la venta presencial
  user: PresentialCheckoutUserInput;
  payment: CheckoutPaymentInput;
}

export class CheckoutService {
  constructor(
    private readonly userRepo: PgUserRepository,
    private readonly planRepo: PgMembershipPlanRepository,
    private readonly userMembershipRepo: PgUserMembershipRepository,
    private readonly membershipPaymentRepo: PgMembershipPaymentRepository,
    private readonly emailService: EmailService,
  ) {}

  // ============================================================
  // Helper: contraseña temporal alfanumérica (7 caracteres)
  // ============================================================
  private generateTempPassword(length = 7): string {
    // > 6 y < 8 → 7
    const allowed =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * allowed.length);
      pwd += allowed.charAt(idx);
    }
    return pwd;
  }

  // ============================================================
  // CHECKOUT ONLINE (WEB) – igual que antes, retorna JWT
  // ============================================================
  public async checkoutMembership(
    input: CheckoutMembershipInput,
  ): Promise<{ token: string }> {
    const { planCode, branchId, user, payment } = input;

    // 1) Plan
    const plan: MembershipPlan | null = await this.planRepo.findByCode(planCode);
    if (!plan) throw new Error('PLAN_NOT_FOUND');

    if (plan.planScope === 'ONECLUB' && !branchId) {
      throw new Error('BRANCH_REQUIRED_FOR_ONECLUB');
    }

    // 2) Usuario existente
    const exists = await this.userRepo.findByEmailOrRut(user.email, user.rut);
    if (exists) throw new Error('USER_ALREADY_EXISTS');

    // 3) Crear usuario con password provista (web)
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

    // 4) Crear membresía
    const startDate = new Date();
    const endDate = new Date(startDate);

    if (plan.durationMonths > 0) {
      endDate.setMonth(endDate.getMonth() + plan.durationMonths);
    } else {
      endDate.setDate(endDate.getDate() + 7);
    }

    const membership = await this.userMembershipRepo.create({
      planCode: plan.code,
      userId: createdUser.id,
      branchId, // ONECLUB → sucursal; MULTICLUB → null
      startDate,
      endDate,
    });

    // 5) Card brand/type aleatorio
    const cardTypes = ['CREDIT', 'DEBIT'] as const;
    const cardBrands = ['VISA', 'MASTERCARD'] as const;
    const cardType =
      cardTypes[Math.floor(Math.random() * cardTypes.length)];
    const cardBrand =
      cardBrands[Math.floor(Math.random() * cardBrands.length)];

    logger.info(
      `Checkout ONLINE - tarjeta generada aleatoriamente: type=${cardType}, brand=${cardBrand}`,
    );

    // 6) Registrar pago (branchId → sucursal si ONECLUB, null si MULTICLUB online)
    const paymentRow = await this.membershipPaymentRepo.create({
      membershipId: membership.id,
      userId: createdUser.id,
      amount: payment.amount,
      currency: payment.currency,
      cardLast4: payment.cardLast4,
      cardType,
      cardBrand,
      branchId: branchId ?? null,
    });

    // 7) JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET_NOT_CONFIGURED');

    const tokenIssuedAt = Math.floor(Date.now() / 1000);
    const tokenExpiresAt = tokenIssuedAt + 60 * 60;

    const payload = {
      sub: createdUser.id,
      iat: tokenIssuedAt,
      exp: tokenExpiresAt,
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
        // branchId: paymentRow.branch_id, // si lo quieres usar después
      },
    };

    const token = jwt.sign(payload, jwtSecret);
    return { token };
  }

  // ============================================================
  // CHECKOUT PRESENCIAL (ADMIN)
  // - No recibe password
  // - Genera password temporal (hash en BD)
  // - Siempre asocia branchId al pago
  // - Membresía:
  //     ONECLUB  → branchId de la venta
  //     MULTICLUB → branchId null
  // ============================================================
  public async checkoutMembershipPresential(
    input: PresentialCheckoutMembershipInput,
  ): Promise<{
    user: UserRow;
    membership: UserMembershipRow;
    payment: MembershipPaymentRow;
    plan: MembershipPlan;
    tempPassword: string;
  }> {
    const { planCode, branchId: saleBranchId, user, payment } = input;

    // 1) Plan
    const plan: MembershipPlan | null = await this.planRepo.findByCode(planCode);
    if (!plan) throw new Error('PLAN_NOT_FOUND');

    // 2) Sucursal: para venta presencial siempre debe venir
    if (!saleBranchId) {
      throw new Error('BRANCH_REQUIRED_FOR_PRESENTIAL');
    }

    // 3) Usuario existente
    const exists = await this.userRepo.findByEmailOrRut(user.email, user.rut);
    if (exists) throw new Error('USER_ALREADY_EXISTS');

    // 4) Generar password temporal (7 chars alfanuméricos)
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

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

    // 5) Membresía
    const startDate = new Date();
    const endDate = new Date(startDate);

    if (plan.durationMonths > 0) {
      endDate.setMonth(endDate.getMonth() + plan.durationMonths);
    } else {
      endDate.setDate(endDate.getDate() + 7);
    }

    // ONECLUB → branchId de la venta; MULTICLUB → null en la membresía
    const membershipBranchId =
      plan.planScope === 'ONECLUB' ? saleBranchId : null;

    const membership = await this.userMembershipRepo.create({
      planCode: plan.code,
      userId: createdUser.id,
      branchId: membershipBranchId,
      startDate,
      endDate,
    });

    // 6) Card brand/type aleatorio
    const cardTypes = ['CREDIT', 'DEBIT'] as const;
    const cardBrands = ['VISA', 'MASTERCARD'] as const;
    const cardType =
      cardTypes[Math.floor(Math.random() * cardTypes.length)];
    const cardBrand =
      cardBrands[Math.floor(Math.random() * cardBrands.length)];

    logger.info(
      `Checkout PRESENCIAL - tarjeta generada aleatoriamente: type=${cardType}, brand=${cardBrand}`,
    );

    // 7) Pago: SIEMPRE asignar branchId de la sucursal donde pagó
    const paymentRow = await this.membershipPaymentRepo.create({
      membershipId: membership.id,
      userId: createdUser.id,
      amount: payment.amount,
      currency: payment.currency,
      cardLast4: payment.cardLast4,
      cardType,
      cardBrand,
      branchId: saleBranchId,
    });

    return {
      user: createdUser,
      membership,
      payment: paymentRow,
      plan,
      tempPassword,
    };
  }

  // ============================================================
  // Disparar envío de correo (lo usa el controller de forma async)
  // ============================================================
  public async sendPresentialSaleEmail(args: {
    user: UserRow;
    membership: UserMembershipRow;
    payment: MembershipPaymentRow;
    plan: MembershipPlan;
    tempPassword: string;
  }): Promise<void> {
    await this.emailService.sendPresentialSaleEmail(args);
  }
}

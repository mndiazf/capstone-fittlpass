// src/routes/checkout.routes.ts
import { Router } from 'express';

import { PgMembershipPlanRepository } from '../repositories/membership/membership-plan.repository';
import { PgUserMembershipRepository } from '../repositories/membership/user-membership.repository';
import { PgMembershipPaymentRepository } from '../repositories/membership/membership-payment.repository';
import { PgUserRepository } from '../repositories/user/user.repository';
import { CheckoutService } from '../services/checkout/checkout.service';
import { CheckoutController } from '../controllers/checkout/checkout.controller';
import { EmailService } from '../utils/email.service';

// ===== Composition Root =====
const userRepo = new PgUserRepository();
const planRepo = new PgMembershipPlanRepository();
const userMembershipRepo = new PgUserMembershipRepository();
const membershipPaymentRepo = new PgMembershipPaymentRepository();
const emailService = new EmailService();

const checkoutService = new CheckoutService(
  userRepo,
  planRepo,
  userMembershipRepo,
  membershipPaymentRepo,
  emailService,
);

const checkoutController = new CheckoutController(checkoutService);

export const checkoutRouter = Router();

// === Rutas ===

// Venta ONLINE (web público)
checkoutRouter.post(
  '/checkout/memberships',
  checkoutController.registerMembership,
);

// Venta PRESENCIAL (admin / dashboard)
checkoutRouter.post(
  '/checkout/memberships/presencial',
  checkoutController.registerMembershipPresential,
);

// src/routes/checkout.routes.ts
import { Router } from 'express';

import { CheckoutController } from '../controllers/checkout.controller';
import { CheckoutService } from '../services/checkout.service';

import { PgUserRepository } from '../repositories/user.repository';
import { PgMembershipPlanRepository } from '../repositories/membership-plan.repository';
import { PgUserMembershipRepository } from '../repositories/user-membership.repository';
import { PgMembershipPaymentRepository } from '../repositories/membership-payment.repository';

// ===== Composition Root =====
const userRepo = new PgUserRepository();
const planRepo = new PgMembershipPlanRepository();
const userMembershipRepo = new PgUserMembershipRepository();
const membershipPaymentRepo = new PgMembershipPaymentRepository();

const checkoutService = new CheckoutService(
  userRepo,
  planRepo,
  userMembershipRepo,
  membershipPaymentRepo
);

const checkoutController = new CheckoutController(checkoutService);

export const checkoutRouter = Router();

// === Rutas ===
checkoutRouter.post(
  '/checkout/memberships',
  checkoutController.registerMembership
);

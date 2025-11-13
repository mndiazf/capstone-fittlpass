// src/routes/checkout.routes.ts
import { Router } from 'express';


import { PgMembershipPlanRepository } from '../repositories/membership/membership-plan.repository';
import { PgUserMembershipRepository } from '../repositories/membership/user-membership.repository';
import { PgMembershipPaymentRepository } from '../repositories/membership/membership-payment.repository';
import { PgUserRepository } from '../repositories/user/user.repository';
import { CheckoutService } from '../services/checkout/checkout.service';
import { CheckoutController } from '../controllers/checkout/checkout.controller';

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

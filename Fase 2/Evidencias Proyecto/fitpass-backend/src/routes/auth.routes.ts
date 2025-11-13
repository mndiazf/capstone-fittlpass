// src/routes/auth.routes.ts
import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';

import { PgUserRepository } from '../repositories/user.repository';
import { PgUserMembershipRepository } from '../repositories/user-membership.repository';
import { PgMembershipPlanRepository } from '../repositories/membership-plan.repository';
import { PgMembershipPaymentRepository } from '../repositories/membership-payment.repository';

// === Composition Root ===
const userRepo = new PgUserRepository();
const userMembershipRepo = new PgUserMembershipRepository();
const planRepo = new PgMembershipPlanRepository();
const membershipPaymentRepo = new PgMembershipPaymentRepository();

const authService = new AuthService(
  userRepo,
  userMembershipRepo,
  planRepo,
  membershipPaymentRepo,
);
const authController = new AuthController(authService);

// === Router ===
export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/auth/login', authController.login);

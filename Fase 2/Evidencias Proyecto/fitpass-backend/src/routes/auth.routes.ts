// src/routes/auth.routes.ts
import { Router } from 'express';


import { PgUserMembershipRepository } from '../repositories/membership/user-membership.repository';
import { PgMembershipPlanRepository } from '../repositories/membership/membership-plan.repository';
import { PgMembershipPaymentRepository } from '../repositories/membership/membership-payment.repository';
import { AuthController } from '../controllers/auth/auth.controller';
import { PgUserRepository } from '../repositories/user/user.repository';
import { AuthService } from '../services/auth/auth.service';

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

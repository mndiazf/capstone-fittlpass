// src/routes/auth.routes.ts
import { Router } from 'express';

import { PgUserMembershipRepository } from '../repositories/membership/user-membership.repository';
import { PgMembershipPlanRepository } from '../repositories/membership/membership-plan.repository';
import { PgMembershipPaymentRepository } from '../repositories/membership/membership-payment.repository';
import { AuthController } from '../controllers/auth/auth.controller';
import { PgUserRepository } from '../repositories/user/user.repository';
import { AuthService } from '../services/auth/auth.service';
import { PgMembershipDayUsageRepository } from '../repositories/membership/membership-day-usage.repository';
import { MembershipUsageService } from '../services/membership/membership-usage.service';

const userRepo = new PgUserRepository();
const userMembershipRepo = new PgUserMembershipRepository();
const planRepo = new PgMembershipPlanRepository();
const membershipPaymentRepo = new PgMembershipPaymentRepository();

// uso de membresía (membership_day_usage)
const membershipDayUsageRepo = new PgMembershipDayUsageRepository();
const membershipUsageService = new MembershipUsageService(
  membershipDayUsageRepo,
);

const authService = new AuthService(
  userRepo,
  userMembershipRepo,
  planRepo,
  membershipPaymentRepo,
  membershipUsageService,
);
const authController = new AuthController(authService);

export const authRouter = Router();

authRouter.post('/auth/login', authController.login);

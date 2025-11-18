// src/routes/admin-auth.routes.ts
import { Router } from 'express';
import { AdminAuthService } from '../services/auth/admin-auth.service';
import { PgUserRepository } from '../repositories/user/user.repository';
import { PgStaffAccessRepository } from '../repositories/auth/staff-access.repository';
import { AdminAuthController } from '../controllers/auth/admin-auth.controller';

const router = Router();

// wiring de dependencias "a mano"
const userRepo = new PgUserRepository();
const staffAccessRepo = new PgStaffAccessRepository();
const adminAuthService = new AdminAuthService(userRepo, staffAccessRepo);
const adminAuthController = new AdminAuthController(adminAuthService);

// POST /api/admin/auth/login
router.post('/login', adminAuthController.login);

export default router;

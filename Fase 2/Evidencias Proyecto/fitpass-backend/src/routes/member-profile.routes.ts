import { Router } from 'express';
import { PgMemberProfileRepository } from '../repositories/members/member-profile.repository';
import { MemberProfileService } from '../services/members/member-profile.service';
import { MemberProfileController } from '../controllers/members/member-profile.controller';

const router = Router();

// Wiring manual de dependencias
const memberProfileRepo = new PgMemberProfileRepository();
const memberProfileService = new MemberProfileService(memberProfileRepo);
const memberProfileController = new MemberProfileController(memberProfileService);

// GET /api/members/profile-by-rut?rut=...&branchId=...
router.get(
  '/members/profile-by-rut',
  memberProfileController.getProfileByRut
);

export const memberProfileRouter = router;

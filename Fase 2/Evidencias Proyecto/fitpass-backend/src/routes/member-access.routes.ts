// src/routes/member-access.routes.ts
import { Router } from 'express';

import { PgAccessLogRepository } from '../repositories/access/access-log.repository';
import { MemberAccessController } from '../controllers/member/member-access.controller';
import { MemberAccessService } from '../services/member/member-access.service';

const memberAccessRouter = Router();

// Wiring manual respetando capas
const accessLogRepo = new PgAccessLogRepository();
const memberAccessService = new MemberAccessService(accessLogRepo);
const memberAccessController = new MemberAccessController(memberAccessService);

// GET /api/members/:userId/accesses/last-week
memberAccessRouter.get(
  '/:userId/accesses/last-week',
  memberAccessController.getLastWeekAccesses,
);

export default memberAccessRouter;

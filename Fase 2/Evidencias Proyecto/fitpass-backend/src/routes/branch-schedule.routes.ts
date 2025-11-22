import { Router } from 'express';
import { BranchScheduleService } from '../services/branches/branch-schedule.service';
import { BranchScheduleController } from '../controllers/branches/branch-schedule.controller';
import { PgBranchScheduleRepository } from '../repositories/branch/branch-schedule.repository';

const router = Router();

// wiring manual de dependencias
const repo = new PgBranchScheduleRepository();
const service = new BranchScheduleService(repo);
const controller = new BranchScheduleController(service);

// === Horarios de apertura de la sucursal ===
// GET /api/admin/branches/:branchId/opening-hours
router.get(
  '/branches/:branchId/opening-hours',
  controller.getOpeningHours
);

// PUT /api/admin/branches/:branchId/opening-hours
router.put(
  '/branches/:branchId/opening-hours',
  controller.saveOpeningHours
);

// === Estado de la sucursal (abrir / cerrar / cierre temporal) ===
// GET /api/admin/branches/:branchId/status
router.get(
  '/branches/:branchId/status',
  controller.getBranchStatus
);

// POST /api/admin/branches/:branchId/open
router.post(
  '/branches/:branchId/open',
  controller.openBranch
);

// POST /api/admin/branches/:branchId/close
router.post(
  '/branches/:branchId/close',
  controller.closeBranch
);

// POST /api/admin/branches/:branchId/temp-close
router.post(
  '/branches/:branchId/temp-close',
  controller.tempCloseBranch
);

export const branchScheduleRouter = router;

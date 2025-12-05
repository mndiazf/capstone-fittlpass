import { Router } from 'express';
import { PgMemberManagementRepository } from '../repositories/members/member-management.repository';
import { MemberManagementService } from '../services/members/member-management.service';
import { MemberManagementController } from '../controllers/members/member-management.controller';

const router = Router();

// Wiring manual de dependencias
const repo = new PgMemberManagementRepository();
const service = new MemberManagementService(repo);
const controller = new MemberManagementController(service);

// Búsqueda de miembros
// GET /api/admin/members/search?query=...&limit=1&branchId=...
router.get('/members/search', controller.searchMembers);

// Historial de accesos
// GET /api/admin/members/:id/access-history?limit=10
router.get('/members/:id/access-history', controller.getAccessHistory);

// Bloquear usuario (impedir ingreso)
// POST /api/admin/members/:id/block
router.post('/members/:id/block', controller.blockMember);

// Desbloquear usuario (permitir ingreso)
// POST /api/admin/members/:id/unblock
router.post('/members/:id/unblock', controller.unblockMember);

export const memberManagementRouter = router;

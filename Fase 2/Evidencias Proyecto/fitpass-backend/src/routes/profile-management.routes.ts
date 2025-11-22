import { Router } from 'express';
import { PgProfileManagementRepository } from '../repositories/profiles/profile-management.repository';
import { ProfileManagementService } from '../services/profiles/profile-management.service';
import { ProfileManagementController } from '../controllers/profiles/profile-management.controller';

const router = Router();

// wiring manual de dependencias
const repo = new PgProfileManagementRepository();
const service = new ProfileManagementService(repo);
const controller = new ProfileManagementController(service);

// === Permisos base (para armar el árbol en la UI) ===
// GET /api/admin/permissions
router.get('/permissions', controller.getAllPermissions);

// === CRUD de perfiles (por sucursal) ===
// GET /api/admin/profiles?branchId=...
router.get('/profiles', controller.getAllProfiles);

// GET /api/admin/profiles/:id
router.get('/profiles/:id', controller.getProfileById);

// POST /api/admin/profiles
router.post('/profiles', controller.createProfile);

// PUT /api/admin/profiles/:id
router.put('/profiles/:id', controller.updateProfile);

// DELETE /api/admin/profiles/:id
router.delete('/profiles/:id', controller.deleteProfile);

// === Asignación de perfiles a STAFF ===
// GET /api/admin/staff/:userId/profiles
router.get('/staff/:userId/profiles', controller.getUserProfiles);

// POST /api/admin/staff/:userId/profiles
router.post('/staff/:userId/profiles', controller.assignProfileToUser);

// DELETE /api/admin/staff/profile-assignments/:assignmentId
router.delete(
  '/staff/profile-assignments/:assignmentId',
  controller.deactivateAssignment
);

export const profileManagementRouter = router;

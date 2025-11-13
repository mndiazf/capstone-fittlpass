import { Router } from 'express';
import { PgMembershipPlanRepository } from '../repositories/membership-plan.repository';
import { CatalogService } from '../services/catalog.service';
import { CatalogController } from '../controllers/catalog.controller';

// === Composition Root (DIP) ===
const membershipPlanRepository = new PgMembershipPlanRepository();
const catalogService = new CatalogService(membershipPlanRepository);
const catalogController = new CatalogController(catalogService);

// === Router ===
export const catalogRouter = Router();

// GET /api/catalog/memberships
catalogRouter.get(
  '/catalog/memberships',
  catalogController.getMemberships,
);

// GET /api/catalog/branches
catalogRouter.get(
  '/catalog/branches',
  catalogController.getBranches,
);

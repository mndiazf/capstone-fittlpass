// src/routes/dashboard.routes.ts
import { Router } from 'express';
import { PgDashboardRepository } from '../repositories/dashboard/dashboard.repository';
import { DashboardService } from '../services/dashboard/dashboard.service';
import { DashboardController } from '../controllers/dashboard/dashboard.controller';

const dashboardRouter = Router();

// Wiring manual respetando capas
const dashboardRepo = new PgDashboardRepository();
const dashboardService = new DashboardService(dashboardRepo);
const dashboardController = new DashboardController(dashboardService);

// GET /api/dashboard/today?branchId=...
dashboardRouter.get(
  '/today',
  dashboardController.getTodaySummary,
);

export default dashboardRouter;

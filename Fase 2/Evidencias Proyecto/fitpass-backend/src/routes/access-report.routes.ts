// src/routes/access-report.routes.ts
import { Router } from 'express';
import { PgAccessReportRepository } from '../repositories/reports/access-report.repository';
import { AccessReportService } from '../services/reports/access-report.service';
import { AccessReportController } from '../controllers/reports/access-report.controller';

const accessReportRouter = Router();

// Wiring manual respetando capas
const reportRepo = new PgAccessReportRepository();
const reportService = new AccessReportService(reportRepo);
const reportController = new AccessReportController(reportService);

// GET /api/reports/access-logs
accessReportRouter.get(
  '/access-logs',
  reportController.getAccessLogs,
);

// GET /api/reports/access-logs/recent
accessReportRouter.get(
  '/access-logs/recent',
  reportController.getRecentAccessLogs,
);

// GET /api/reports/access-logs/export
accessReportRouter.get(
  '/access-logs/export',
  reportController.exportAccessLogsCsv,
);

export default accessReportRouter;

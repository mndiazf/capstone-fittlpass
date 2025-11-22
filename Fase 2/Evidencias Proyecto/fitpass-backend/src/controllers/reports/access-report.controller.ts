// src/controllers/reports/access-report.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import {
  AccessReportService,
} from '../../services/reports/access-report.service';
import {
  PersonTypeFilter,
  ResultFilter,
} from '../../repositories/reports/access-report.repository';

export class AccessReportController {
  constructor(
    private readonly accessReportService: AccessReportService,
  ) {}

  /**
   * Parsea un parámetro de fecha (YYYY-MM-DD) a Date.
   * - Si endOfDay = true ⇒ 23:59:59.999
   * - Si no ⇒ 00:00:00.000
   */
  private parseDateParam(
    value: unknown,
    options?: { endOfDay?: boolean },
  ): Date | undefined {
    if (typeof value !== 'string' || !value) return undefined;

    const [yearStr, monthStr, dayStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (!year || !month || !day) {
      return undefined;
    }

    if (options?.endOfDay) {
      // Fin de día (23:59:59.999) en hora local
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    // Inicio de día (00:00:00.000) en hora local
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  /**
   * GET /api/reports/access-logs
   * ?branchId=...&personType=member|staff|all&from=YYYY-MM-DD&to=YYYY-MM-DD&result=GRANTED|DENIED|ALL&page=0&size=20
   */
  public getAccessLogs = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      const {
        branchId,
        personType = 'all',
        from,
        to,
        result = 'ALL',
        page = '0',
        size = '20',
      } = req.query;

      if (!branchId || typeof branchId !== 'string') {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const pageNum = Number(page) || 0;
      const sizeNum = Number(size) || 20;

      const fromDate = this.parseDateParam(from);
      const toDate = this.parseDateParam(to, { endOfDay: true });

      const filters = {
        branchId,
        from: fromDate,
        to: toDate,
        personType: personType as PersonTypeFilter,
        result: (result as ResultFilter) || 'ALL',
        page: pageNum,
        size: sizeNum,
      };

      const report = await this.accessReportService.getAccessLogsPaged(filters);
      res.status(200).json(report);
    } catch (err) {
      logger.error('Error obteniendo reporte de accesos', err);
      res.status(500).json({
        message: 'Error obteniendo reporte de accesos',
      });
    }
  };

  /**
   * GET /api/reports/access-logs/recent?branchId=...&limit=20
   */
  public getRecentAccessLogs = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      const { branchId, limit = '20' } = req.query;

      if (!branchId || typeof branchId !== 'string') {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const limitNum = Number(limit) || 20;

      const result = await this.accessReportService.getRecentAccessLogs(
        branchId,
        limitNum,
      );

      res.status(200).json(result);
    } catch (err) {
      logger.error('Error obteniendo últimos accesos', err);
      res.status(500).json({
        message: 'Error obteniendo últimos accesos',
      });
    }
  };

  /**
   * GET /api/reports/access-logs/export
   * mismos filtros que getAccessLogs, pero devuelve CSV.
   */
  public exportAccessLogsCsv = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      const {
        branchId,
        personType = 'all',
        from,
        to,
        result = 'ALL',
      } = req.query;

      if (!branchId || typeof branchId !== 'string') {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const fromDate = this.parseDateParam(from);
      const toDate = this.parseDateParam(to, { endOfDay: true });

      const csv = await this.accessReportService.getAccessLogsCsv({
        branchId,
        from: fromDate,
        to: toDate,
        personType: personType as PersonTypeFilter,
        result: result as ResultFilter,
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="reporte-accesos.csv"',
      );
      res.status(200).send(csv);
    } catch (err) {
      logger.error('Error exportando reporte de accesos', err);
      res.status(500).json({
        message: 'Error exportando reporte de accesos',
      });
    }
  };
}

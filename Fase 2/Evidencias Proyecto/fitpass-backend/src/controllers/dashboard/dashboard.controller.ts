// src/controllers/dashboard/dashboard.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import {
  DashboardService,
} from '../../services/dashboard/dashboard.service';

export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  /**
   * GET /api/dashboard/today?branchId=...
   *
   * Devuelve:
   *  - accessCount: conteo de accesos GRANTED de hoy
   *  - uniquePeopleCount: personas únicas que ingresaron hoy
   *  - salesAmount: suma de ventas (membership_payment.amount) de hoy
   *  - activities: lista de accesos y ventas de hoy ordenadas desc
   */
  public getTodaySummary = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      const { branchId } = req.query;

      if (!branchId || typeof branchId !== 'string') {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const summary = await this.dashboardService.getTodaySummary(branchId);

      res.status(200).json(summary);
    } catch (err) {
      logger.error('Error obteniendo resumen de dashboard de hoy', err);
      res.status(500).json({
        message: 'Error obteniendo resumen de dashboard de hoy',
      });
    }
  };
}

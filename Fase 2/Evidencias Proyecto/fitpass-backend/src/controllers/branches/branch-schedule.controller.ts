import { Request, Response, NextFunction } from 'express';
import { BranchScheduleService } from '../../services/branches/branch-schedule.service';
import { logger } from '../../utils/logger';

export class BranchScheduleController {
  constructor(private readonly service: BranchScheduleService) {}

  // GET /api/admin/branches/:branchId/opening-hours
  public getOpeningHours = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { branchId } = req.params;

      if (!branchId) {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const hours = await this.service.getOpeningHours(branchId);
      res.status(200).json(hours);
    } catch (err) {
      logger.error(
        'Error en GET /api/admin/branches/:branchId/opening-hours',
        err
      );
      res
        .status(500)
        .json({ message: 'Error al obtener horarios de la sucursal' });
    }
  };

  // PUT /api/admin/branches/:branchId/opening-hours
  // body: OpeningHourDto[] (el front manda dayOfWeek/openTime/closeTime)
  public saveOpeningHours = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { branchId } = req.params;
      const items = req.body ?? [];

      if (!branchId) {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const updated = await this.service.saveOpeningHours(branchId, items);
      res.status(200).json(updated);
    } catch (err: any) {
      logger.error(
        'Error en PUT /api/admin/branches/:branchId/opening-hours',
        err
      );

      if (err?.status === 400 && err.message === 'INVALID_DAY_OF_WEEK') {
        res.status(400).json({
          message: 'dayOfWeek debe estar entre 1 (lunes) y 7 (domingo)',
        });
        return;
      }

      res
        .status(500)
        .json({ message: 'Error al guardar horarios de la sucursal' });
    }
  };

  // GET /api/admin/branches/:branchId/status
  public getBranchStatus = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { branchId } = req.params;

      if (!branchId) {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const status = await this.service.getBranchStatus(branchId);
      if (!status) {
        res.status(404).json({ message: 'Estado de sucursal no encontrado' });
        return;
      }

      res.status(200).json(status);
    } catch (err) {
      logger.error(
        'Error en GET /api/admin/branches/:branchId/status',
        err
      );
      res
        .status(500)
        .json({ message: 'Error al obtener estado de la sucursal' });
    }
  };

  // POST /api/admin/branches/:branchId/open
  public openBranch = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { branchId } = req.params;

      if (!branchId) {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const status = await this.service.openBranch(branchId);
      res.status(200).json(status);
    } catch (err) {
      logger.error(
        'Error en POST /api/admin/branches/:branchId/open',
        err
      );
      res.status(500).json({ message: 'Error al abrir sucursal' });
    }
  };

  // POST /api/admin/branches/:branchId/close
  // body: { reason?: string }
  public closeBranch = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { branchId } = req.params;
      const { reason } = req.body ?? {};

      if (!branchId) {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const status = await this.service.closeBranch(branchId, reason);
      res.status(200).json(status);
    } catch (err) {
      logger.error(
        'Error en POST /api/admin/branches/:branchId/close',
        err
      );
      res.status(500).json({ message: 'Error al cerrar sucursal' });
    }
  };

  // POST /api/admin/branches/:branchId/temp-close
  // body: { reason: string }
  public tempCloseBranch = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { branchId } = req.params;
      const { reason } = req.body ?? {};

      if (!branchId) {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const status = await this.service.tempCloseBranch(branchId, reason);
      res.status(200).json(status);
    } catch (err: any) {
      logger.error(
        'Error en POST /api/admin/branches/:branchId/temp-close',
        err
      );

      if (
        err?.status === 400 &&
        err.message === 'TEMP_CLOSE_REASON_REQUIRED'
      ) {
        res
          .status(400)
          .json({ message: 'reason es obligatorio para cierre temporal' });
        return;
      }

      res
        .status(500)
        .json({ message: 'Error al cerrar temporalmente la sucursal' });
    }
  };
}

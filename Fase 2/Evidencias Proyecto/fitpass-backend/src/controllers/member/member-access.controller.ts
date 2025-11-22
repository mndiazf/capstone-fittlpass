// src/controllers/member/member-access.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { MemberAccessService } from '../../services/member/member-access.service';

export class MemberAccessController {
  constructor(
    private readonly memberAccessService: MemberAccessService,
  ) {}

  /**
   * GET /api/members/:userId/accesses/last-week
   */
  public getLastWeekAccesses = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ message: 'userId es obligatorio' });
        return;
      }

      const accesses =
        await this.memberAccessService.getLastWeekAccessesForUser(userId);

      res.status(200).json({
        userId,
        range: 'last_7_days',
        items: accesses,
      });
    } catch (err) {
      logger.error('Error obteniendo accesos de la última semana', err);
      res.status(500).json({
        message: 'Error obteniendo accesos de la última semana',
      });
    }
  };
}

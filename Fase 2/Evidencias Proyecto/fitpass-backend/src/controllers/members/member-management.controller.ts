// src/controllers/members/member-management.controller.ts
import { Request, Response, NextFunction } from 'express';
import { MemberManagementService } from '../../services/members/member-management.service';
import { logger } from '../../utils/logger';

export class MemberManagementController {
  constructor(private readonly service: MemberManagementService) {}

  // GET /api/admin/members/search?query=...&limit=1&branchId=branch-scl-lascondes
  public searchMembers = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { query, limit, branchId } = req.query;

      if (!query || typeof query !== 'string' || !query.trim()) {
        res.status(400).json({ message: 'query es obligatorio' });
        return;
      }

      const take = limit ? Number(limit) : 10;
      const branchIdStr =
        typeof branchId === 'string' && branchId.trim() ? branchId : null;

      const members = await this.service.searchMembers(
        query,
        take,
        branchIdStr
      );

      res.status(200).json({
        members,
        total: members.length,
      });
    } catch (err) {
      logger.error('Error en GET /api/admin/members/search', err);
      res.status(500).json({ message: 'Error al buscar miembros' });
    }
  };

  // GET /api/admin/members/:id/access-history?limit=10
  public getAccessHistory = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit } = req.query;

      if (!id || typeof id !== 'string') {
        res.status(400).json({ message: 'id es obligatorio' });
        return;
      }

      const take = limit ? Number(limit) : 10;

      const history = await this.service.getAccessHistory(id, take);
      res.status(200).json(history);
    } catch (err) {
      logger.error(
        'Error en GET /api/admin/members/:id/access-history',
        err
      );
      res.status(500).json({ message: 'Error al obtener historial de accesos' });
    }
  };

  // POST /api/admin/members/:id/block
  public blockMember = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({ message: 'id es obligatorio' });
        return;
      }

      const result = await this.service.blockMember(id);
      res.status(200).json(result);
    } catch (err) {
      logger.error('Error en POST /api/admin/members/:id/block', err);

      if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
        res.status(404).json({ message: 'Usuario no encontrado' });
        return;
      }

      res.status(500).json({ message: 'Error al bloquear usuario' });
    }
  };

  // POST /api/admin/members/:id/unblock
  public unblockMember = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({ message: 'id es obligatorio' });
        return;
      }

      const result = await this.service.unblockMember(id);
      res.status(200).json(result);
    } catch (err) {
      logger.error('Error en POST /api/admin/members/:id/unblock', err);

      if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
        res.status(404).json({ message: 'Usuario no encontrado' });
        return;
      }

      res.status(500).json({ message: 'Error al desbloquear usuario' });
    }
  };
}

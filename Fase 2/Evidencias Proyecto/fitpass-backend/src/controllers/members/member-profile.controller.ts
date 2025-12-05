// src/controllers/members/member-profile.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { MemberProfileService } from '../../services/members/member-profile.service';

export class MemberProfileController {
  constructor(private readonly memberProfileService: MemberProfileService) {}

  // GET /api/members/profile-by-rut?rut=11.111.111-1&branchId=branch-scl-centro
  public getProfileByRut = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { rut, branchId } = req.query;

      if (!rut || typeof rut !== 'string' || !rut.trim()) {
        res.status(400).json({ message: 'rut es obligatorio' });
        return;
      }

      if (!branchId || typeof branchId !== 'string' || !branchId.trim()) {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const profile = await this.memberProfileService.getProfileByRutAndBranch(
        rut,
        branchId
      );

      res.status(200).json(profile);
    } catch (err) {
      logger.error('Error en GET /members/profile-by-rut', err);

      if (err instanceof Error) {
        if (err.message === 'MEMBER_NOT_FOUND') {
          res.status(404).json({ message: 'Usuario no encontrado' });
          return;
        }

        if (err.message === 'MEMBERSHIP_NOT_ALLOWED_FOR_BRANCH') {
          res.status(403).json({
            message:
              'La membresía del usuario no es válida para esta sucursal',
          });
          return;
        }
      }

      res.status(500).json({
        message: 'Error al obtener el perfil del usuario por RUT',
      });
    }
  };

  /**
   * Autocompletar por RUT o nombre:
   *
   * GET /api/members/search?term=manolo&branchId=branch-scl-centro&limit=10
   *
   * - term: puede ser RUT parcial ("11111-") o nombre parcial ("MANO", "DIAZ", "MANO DIAZ").
   * - branchId: sucursal donde se está consultando (aplica misma lógica de ONECLUB/MULTICLUB).
   * - limit: opcional, default 10.
   */
  public searchMembers = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { term, branchId, limit } = req.query;

      if (!term || typeof term !== 'string' || !term.trim()) {
        res.status(400).json({ message: 'term es obligatorio' });
        return;
      }

      // Para autocompletar, exige al menos 2 caracteres
      if (term.trim().length < 2) {
        res.status(400).json({
          message: 'term debe tener al menos 2 caracteres',
        });
        return;
      }

      if (!branchId || typeof branchId !== 'string' || !branchId.trim()) {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      let parsedLimit = 10;
      if (typeof limit === 'string') {
        const n = parseInt(limit, 10);
        if (!Number.isNaN(n) && n > 0 && n <= 50) {
          parsedLimit = n;
        }
      }

      const results = await this.memberProfileService.searchProfiles(
        term,
        branchId,
        parsedLimit
      );

      res.status(200).json(results);
    } catch (err) {
      logger.error('Error en GET /members/search', err);
      res.status(500).json({
        message: 'Error al buscar usuarios por term (RUT o nombre)',
      });
    }
  };
}

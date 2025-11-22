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
}

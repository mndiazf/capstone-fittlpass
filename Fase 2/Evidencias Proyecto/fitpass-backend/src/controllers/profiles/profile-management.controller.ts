import { Request, Response, NextFunction } from 'express';
import { ProfileManagementService } from '../../services/profiles/profile-management.service';
import { logger } from '../../utils/logger';

export class ProfileManagementController {
  constructor(private readonly service: ProfileManagementService) {}

  // GET /api/admin/permissions
  public getAllPermissions = async (
    _req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const permissions = await this.service.getAllPermissions();
      res.status(200).json(permissions);
    } catch (err) {
      logger.error('Error en GET /api/admin/permissions', err);
      res.status(500).json({ message: 'Error al obtener permisos' });
    }
  };

  // GET /api/admin/profiles?branchId=...
  public getAllProfiles = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { branchId } = req.query;

      if (!branchId || typeof branchId !== 'string') {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const profiles = await this.service.getAllProfiles(branchId);
      res.status(200).json(profiles);
    } catch (err) {
      logger.error('Error en GET /api/admin/profiles', err);
      res.status(500).json({ message: 'Error al obtener perfiles' });
    }
  };

  // GET /api/admin/profiles/:id
  public getProfileById = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: 'id es obligatorio' });
        return;
      }

      const profile = await this.service.getProfile(id);
      if (!profile) {
        res.status(404).json({ message: 'Perfil no encontrado' });
        return;
      }

      res.status(200).json(profile);
    } catch (err) {
      logger.error('Error en GET /api/admin/profiles/:id', err);
      res.status(500).json({ message: 'Error al obtener perfil' });
    }
  };

  // POST /api/admin/profiles
  // body: { branchId, name, description?, isDefault?, permissionIds? }
  public createProfile = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { branchId, name, description, isDefault, permissionIds } = req.body;

      if (!branchId || typeof branchId !== 'string') {
        res.status(400).json({ message: 'branchId es obligatorio' });
        return;
      }

      const created = await this.service.createProfile({
        branchId,
        name,
        description,
        isDefault,
        permissionIds,
      });

      res.status(201).json(created);
    } catch (err: any) {
      logger.error('Error en POST /api/admin/profiles', err);

      if (err?.status === 400 && err.message === 'PROFILE_NAME_REQUIRED') {
        res.status(400).json({ message: 'El nombre del perfil es obligatorio' });
        return;
      }

      res.status(500).json({ message: 'Error al crear perfil' });
    }
  };

  // PUT /api/admin/profiles/:id
  // body: { name?, description?, isDefault?, permissionIds? }
  public updateProfile = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: 'id es obligatorio' });
        return;
      }

      const { name, description, isDefault, permissionIds } = req.body;

      const updated = await this.service.updateProfile(id, {
        name,
        description,
        isDefault,
        permissionIds,
      });

      res.status(200).json(updated);
    } catch (err: any) {
      logger.error('Error en PUT /api/admin/profiles/:id', err);

      if (err?.status === 404 && err.message === 'PROFILE_NOT_FOUND') {
        res.status(404).json({ message: 'Perfil no encontrado' });
        return;
      }

      res.status(500).json({ message: 'Error al actualizar perfil' });
    }
  };

  // DELETE /api/admin/profiles/:id
  public deleteProfile = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: 'id es obligatorio' });
        return;
      }

      await this.service.deleteProfile(id);
      res.status(204).send();
    } catch (err) {
      logger.error('Error en DELETE /api/admin/profiles/:id', err);
      res.status(500).json({ message: 'Error al eliminar perfil' });
    }
  };

  // GET /api/admin/staff/:userId/profiles
  public getUserProfiles = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ message: 'userId es obligatorio' });
        return;
      }

      const profiles = await this.service.getUserProfiles(userId);
      res.status(200).json(profiles);
    } catch (err) {
      logger.error('Error en GET /api/admin/staff/:userId/profiles', err);
      res.status(500).json({ message: 'Error al obtener perfiles del usuario' });
    }
  };

  // POST /api/admin/staff/:userId/profiles
  // body: { profileId }
  public assignProfileToUser = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const { profileId } = req.body;

      if (!userId || !profileId) {
        res.status(400).json({ message: 'userId y profileId son obligatorios' });
        return;
      }

      const result = await this.service.assignProfileToUser(userId, profileId);

      res.status(201).json(result);
    } catch (err: any) {
      logger.error('Error en POST /api/admin/staff/:userId/profiles', err);

      if (err?.status === 400 && err.message === 'USER_IS_NOT_STAFF') {
        res.status(400).json({ message: 'El usuario no es STAFF' });
        return;
      }

      if (err?.status === 404 && err.message === 'PROFILE_NOT_FOUND') {
        res.status(404).json({ message: 'Perfil no encontrado' });
        return;
      }

      res.status(500).json({ message: 'Error al asignar perfil al usuario' });
    }
  };

  // DELETE /api/admin/staff/profile-assignments/:assignmentId
  public deactivateAssignment = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { assignmentId } = req.params;

      if (!assignmentId) {
        res.status(400).json({ message: 'assignmentId es obligatorio' });
        return;
      }

      await this.service.deactivateAssignment(assignmentId);
      res.status(204).send();
    } catch (err) {
      logger.error(
        'Error en DELETE /api/admin/staff/profile-assignments/:assignmentId',
        err
      );
      res
        .status(500)
        .json({ message: 'Error al desactivar asignación de perfil' });
    }
  };
}

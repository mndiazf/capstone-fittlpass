// src/controllers/admin-auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AdminAuthService } from '../../services/auth/admin-auth.service';
import { logger } from '../../utils/logger';


export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  public login = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      const { emailOrRut, password } = req.body;

      if (!emailOrRut || !password) {
        res.status(400).json({
          message: 'emailOrRut y password son obligatorios',
        });
        return;
      }

      const { token } = await this.adminAuthService.login({
        emailOrRut,
        password,
      });

      res.status(200).json({
        token,
        tokenType: 'Bearer',
      });
    } catch (err) {
      logger.error('Error en login admin', err);

      if (err instanceof Error) {
        switch (err.message) {
          case 'INVALID_CREDENTIALS':
            res.status(401).json({ message: 'Credenciales inválidas' });
            return;
          case 'NOT_STAFF':
            res.status(403).json({
              message: 'El usuario no tiene permisos de staff',
            });
            return;
          case 'JWT_SECRET_NOT_CONFIGURED':
            res.status(500).json({
              message: 'JWT no configurado en el servidor',
            });
            return;
        }
      }

      res.status(500).json({
        message: 'Error procesando el login de administrador',
      });
    }
  };
}

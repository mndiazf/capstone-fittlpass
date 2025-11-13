// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/auth/auth.service';
import { logger } from '../../utils/logger';


export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

      const { token } = await this.authService.login({ emailOrRut, password });

      // 👉 mismo formato de respuesta que el checkout
      res.status(200).json({
        token,
        tokenType: 'Bearer',
      });
    } catch (err) {
      logger.error('Error en login', err);

      if (err instanceof Error) {
        switch (err.message) {
          case 'INVALID_CREDENTIALS':
            res.status(401).json({ message: 'Credenciales inválidas' });
            return;
          case 'ACTIVE_MEMBERSHIP_NOT_FOUND':
            res.status(400).json({
              message: 'El usuario no tiene una membresía activa',
            });
            return;
          case 'PLAN_NOT_FOUND':
            res.status(500).json({
              message: 'Plan de membresía asociado no encontrado',
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
        message: 'Error procesando el login',
      });
    }
  };
}

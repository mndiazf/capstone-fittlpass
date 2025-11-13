// src/controllers/checkout.controller.ts
import { Request, Response, NextFunction } from 'express';
import { CheckoutService } from '../services/checkout.service';
import { logger } from '../utils/logger';

export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  public registerMembership = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const { planCode, branchId, user, payment } = req.body;

      // Validación básica de payload
      if (!planCode || !user || !payment) {
        res.status(400).json({
          message: 'planCode, user y payment son obligatorios',
        });
        return;
      }

      const { token } = await this.checkoutService.checkoutMembership({
        planCode,
        branchId: branchId ?? null,
        user,
        payment,
      });

      // 👉 Solo devolvemos el JWT; la data va dentro del token
      res.status(201).json({
        token,
        tokenType: 'Bearer',
      });
    } catch (err) {
      logger.error('Error en checkout de membresía', err);

      if (err instanceof Error) {
        switch (err.message) {
          case 'PLAN_NOT_FOUND':
            res
              .status(400)
              .json({ message: 'Plan de membresía no encontrado' });
            return;
          case 'BRANCH_REQUIRED_FOR_ONECLUB':
            res.status(400).json({
              message: 'branchId es obligatorio para planes ONECLUB',
            });
            return;
          case 'USER_ALREADY_EXISTS':
            res.status(409).json({
              message: 'Ya existe un usuario con ese email o RUT',
            });
            return;
          case 'JWT_SECRET_NOT_CONFIGURED':
            res
              .status(500)
              .json({ message: 'JWT no configurado en el servidor' });
            return;
        }
      }

      res.status(500).json({
        message: 'Error procesando el registro de la membresía',
      });
    }
  };
}

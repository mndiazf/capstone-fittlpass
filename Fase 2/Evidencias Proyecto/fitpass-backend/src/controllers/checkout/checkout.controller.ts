// src/controllers/checkout/checkout.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  CheckoutService,
  PresentialCheckoutMembershipInput,
} from '../../services/checkout/checkout.service';
import { logger } from '../../utils/logger';

export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  // ============================================================
  // VENTA ONLINE (WEB) - igual que antes
  // ============================================================
  public registerMembership = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      const { planCode, branchId, user, payment } = req.body;

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

      res.status(201).json({
        token,
        tokenType: 'Bearer',
      });
    } catch (err) {
      logger.error('Error en checkout de membresía (online)', err);

      if (err instanceof Error) {
        switch (err.message) {
          case 'PLAN_NOT_FOUND':
            res.status(400).json({
              message: 'Plan de membresía no encontrado',
            });
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
            res.status(500).json({
              message: 'JWT no configurado en el servidor',
            });
            return;
        }
      }

      res.status(500).json({
        message: 'Error procesando el registro de la membresía',
      });
    }
  };

  // ============================================================
  // VENTA PRESENCIAL (ADMIN)
  // - sin password en el payload
  // - genera password temporal
  // - correo asincrónico
  // ============================================================
  public registerMembershipPresential = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      const { planCode, branchId, user, payment } =
        req.body as PresentialCheckoutMembershipInput & {
          branchId?: string;
        };

      if (!planCode || !branchId || !user || !payment) {
        res.status(400).json({
          message: 'planCode, branchId, user y payment son obligatorios',
        });
        return;
      }

      const result =
        await this.checkoutService.checkoutMembershipPresential({
          planCode,
          branchId,
          user,
          payment,
        });

      // Envío de correo asincrónico (fire-and-forget)
      try {
        void this.checkoutService
          .sendPresentialSaleEmail({
            user: result.user,
            membership: result.membership,
            payment: result.payment,
            plan: result.plan,
            tempPassword: result.tempPassword,
          })
          .catch((err) => {
            logger.error(
              'Error enviando correo de venta presencial (async)',
              err,
            );
          });
      } catch (err) {
        logger.error(
          'Error inicializando envío de correo de venta presencial',
          err,
        );
        // No se rompe la respuesta al cliente
      }

      res.status(201).json({
        message: 'Membresía registrada correctamente (venta presencial)',
        userId: result.user.id,
        membershipId: result.membership.id,
        paymentId: result.payment.id,
      });
    } catch (err) {
      logger.error('Error en checkout de membresía (presencial)', err);

      if (err instanceof Error) {
        switch (err.message) {
          case 'PLAN_NOT_FOUND':
            res.status(400).json({
              message: 'Plan de membresía no encontrado',
            });
            return;
          case 'BRANCH_REQUIRED_FOR_PRESENTIAL':
            res.status(400).json({
              message: 'branchId es obligatorio para venta presencial',
            });
            return;
          case 'USER_ALREADY_EXISTS':
            res.status(409).json({
              message: 'Ya existe un usuario con ese email o RUT',
            });
            return;
        }
      }

      res.status(500).json({
        message: 'Error procesando el registro presencial de la membresía',
      });
    }
  };
}

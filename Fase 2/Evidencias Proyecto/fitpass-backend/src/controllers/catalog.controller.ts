import { Request, Response } from 'express';
import { ICatalogService } from '../services/catalog.service';
import { PlanScope } from '../repositories/membership-plan.repository';
import { logger } from '../utils/logger';

export class CatalogController {
  constructor(private readonly catalogService: ICatalogService) {}

  public getMemberships = async (req: Request, res: Response): Promise<void> => {
    try {
      const { scope } = req.query as { scope?: string };

      let scopeFilter: PlanScope | undefined;
      if (scope) {
        if (scope !== 'ONECLUB' && scope !== 'MULTICLUB') {
          res.status(400).json({
            message: 'scope debe ser ONECLUB o MULTICLUB',
          });
          return;
        }
        scopeFilter = scope as PlanScope;
      }

      const catalog = await this.catalogService.getMembershipCatalog({
        scope: scopeFilter,
      });

      res.json(catalog);
    } catch (err) {
      logger.error('Error fetching membership catalog', err);
      res.status(500).json({
        message: 'Error al obtener planes de membresía',
      });
    }
  };

  // GET /api/catalog/branches
  public getBranches = async (req: Request, res: Response): Promise<void> => {
    try {
      const branches = await this.catalogService.getBranchesCatalog();
      res.json(branches);
    } catch (error) {
      logger.error('Error fetching branches catalog', error);
      res.status(500).json({
        message: 'Error al obtener catálogo de clubes',
      });
    }
  };
}

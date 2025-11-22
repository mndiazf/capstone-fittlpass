// src/controllers/staff/staff-users.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  CreateStaffUserDto,
  StaffUsersService,
  UpdateStaffUserDto,
} from '../../services/staff/staff-users.service';

const service = new StaffUsersService();

export class StaffUsersController {
  // GET /api/staff/profiles?branchId=...
  async getProfiles(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string | undefined;
      if (!branchId) {
        return res.status(400).json({ error: 'BRANCH_ID_REQUIRED' });
      }
      const profiles = await service.getProfilesByBranch(branchId);
      res.json(profiles);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/staff/users/search?q=...&branchId=...
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const term = (req.query.q as string) ?? '';
      const branchId = req.query.branchId as string | undefined;

      if (!branchId) {
        return res.status(400).json({ error: 'BRANCH_ID_REQUIRED' });
      }

      const results = await service.searchUsers(term, branchId, 10);
      res.json(results);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/staff/users/:id
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id;
      const user = await service.getById(userId);
      if (!user) {
        return res.status(404).json({ error: 'STAFF_USER_NOT_FOUND' });
      }
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/staff/users
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateStaffUserDto;
      const user = await service.create(body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/staff/users/:id
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id;
      const body = req.body as UpdateStaffUserDto;
      const user = await service.update(userId, body);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
}

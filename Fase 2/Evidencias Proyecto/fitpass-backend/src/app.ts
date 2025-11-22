// src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';

import { logger } from './utils/logger';
import { catalogRouter } from './routes/catalog.routes';
import { checkoutRouter } from './routes/checkout.routes';
import { authRouter } from './routes/auth.routes';
import adminAuthRouter from './routes/admin-auth.routes';
import { memberProfileRouter } from './routes/member-profile.routes';
import { memberManagementRouter } from './routes/member-management.routes';
import { profileManagementRouter } from './routes/profile-management.routes';
import staffUsersRoutes from './routes/staff-users.routes';
import { branchScheduleRouter } from './routes/branch-schedule.routes';
import memberAccessRouter from './routes/member-access.routes';
import accessReportRouter from './routes/access-report.routes';
import dashboardRouter from './routes/dashboard.routes';

const app: Application = express();

// === CORS ===
app.use(
  cors({
    origin: [
      'http://localhost:4200',
      'http://localhost:5173',
      'http://localhost:4300',
    ],
    credentials: true,
  }),
);

// Middlewares base
app.use(express.json());

// Logger simple de requests
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Rutas de la API
app.use('/api', catalogRouter);
app.use('/api', checkoutRouter);
app.use('/api', authRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api', memberProfileRouter);
app.use('/api/admin', memberManagementRouter);
app.use('/api/admin', profileManagementRouter);
app.use('/api', staffUsersRoutes);
app.use('/api/admin', branchScheduleRouter);
app.use('/api/reports', accessReportRouter);
app.use('/api/dashboard', dashboardRouter);

// Nueva ruta: accesos del miembro (última semana)
app.use('/api/members', memberAccessRouter);

// 404 para rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: 'Recurso no encontrado',
  });
});

// Middleware genérico de errores
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error no controlado:', err);

  const status = 500;
  const message =
    err instanceof Error ? err.message : 'Error interno del servidor';

  res.status(status).json({ message });
});

export default app;

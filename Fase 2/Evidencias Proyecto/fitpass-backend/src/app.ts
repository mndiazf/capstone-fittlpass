import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';

import { logger } from './utils/logger';
import { catalogRouter } from './routes/catalog.routes';
import { checkoutRouter } from './routes/checkout.routes';
import { authRouter } from './routes/auth.routes';

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
  })
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
app.use('/api', authRouter); // 👈 añade esto

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

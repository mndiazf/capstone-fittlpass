import 'dotenv/config';
// OJO: sin .js
import app from './app';
import { logger } from './utils/logger';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  logger.info(`🚀 FitPass API escuchando en http://localhost:${PORT}`);
});

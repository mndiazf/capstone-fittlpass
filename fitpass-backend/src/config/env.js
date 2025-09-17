import 'dotenv/config';

export const env = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  THRESHOLD_SIM: Number(process.env.THRESHOLD_SIM ?? 0.9),
  THRESHOLD_LIVENESS: Number(process.env.THRESHOLD_LIVENESS ?? 0.8),
  THRESHOLD_QUALITY: Number(process.env.THRESHOLD_QUALITY ?? 0.85),
  EMBEDDING_DIMS: Number(process.env.EMBEDDING_DIMS ?? 512)
};

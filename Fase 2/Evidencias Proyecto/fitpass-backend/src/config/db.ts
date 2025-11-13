// src/config/db.ts
import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger';

const config: PoolConfig = {
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 10,
  idleTimeoutMillis: 30000
};

const pool = new Pool(config);

pool.on('connect', () => {
  logger.info('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('❌ Error en el pool de PostgreSQL', err);
});

/**
 * Helper básico para usar en los repositorios:
 *   const result = await query('SELECT NOW()');
 */
export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

// 👇 añade esto al final del archivo
export const closePool = async (): Promise<void> => {
  await pool.end();
  logger.info('🔌 Pool de PostgreSQL cerrado');
};
/* Logger mínimo para centralizar logs.
 * Más adelante se puede cambiar a Winston, Pino, etc.
 */

type LogArg = unknown;

const info = (...args: LogArg[]): void => {
  console.log('[INFO]', ...args);
};

const warn = (...args: LogArg[]): void => {
  console.warn('[WARN]', ...args);
};

const error = (...args: LogArg[]): void => {
  console.error('[ERROR]', ...args);
};

const debug = (...args: LogArg[]): void => {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[DEBUG]', ...args);
  }
};

export const logger = { info, warn, error, debug };

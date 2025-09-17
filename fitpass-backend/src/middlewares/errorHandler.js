import { HttpError } from '../utils/httpErrors.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details ?? null });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal Server Error' });
}

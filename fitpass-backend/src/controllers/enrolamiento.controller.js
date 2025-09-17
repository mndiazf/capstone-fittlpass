import { parseOrThrow, enrolRequestSchema } from '../utils/validators.js';
import { enrolarOneShotService } from '../services/enrolamiento.service.js';

export async function enrolarOneShot(req, res, next) {
  try {
    const dto = parseOrThrow(enrolRequestSchema, req.body);
    const result = await enrolarOneShotService(dto, { actorPersonaId: null /* token si aplica */ });
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

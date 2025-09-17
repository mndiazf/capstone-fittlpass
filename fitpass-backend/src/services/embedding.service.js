import { assertDims, normalize } from '../utils/vector.js';
import { BadRequest, PreconditionFailed } from '../utils/httpErrors.js';
import { env } from '../config/env.js';

/**
 * Si llega embedding: valida y normaliza.
 * Si no: aquí podrías invocar ONNX Runtime o microservicio para calcularlo desde frames (no implementado).
 */
export function resolveEmbeddingAndScores(payload) {
  const { embedding, livenessScore, qualityScore } = payload;

  if (!embedding) throw BadRequest('Debe enviar "embedding" o implementar pipeline de frames en el servidor');

  if (embedding.dims !== env.EMBEDDING_DIMS) {
    throw BadRequest(`embedding.dims=${embedding.dims} no coincide con EMBEDDING_DIMS=${env.EMBEDDING_DIMS}`);
  }

  assertDims(embedding.values);
  const normalized = normalize(embedding.values);

  if (livenessScore != null && livenessScore < env.THRESHOLD_LIVENESS) {
    throw PreconditionFailed(`livenessScore ${livenessScore} < ${env.THRESHOLD_LIVENESS}`);
  }
  if (qualityScore != null && qualityScore < env.THRESHOLD_QUALITY) {
    throw PreconditionFailed(`qualityScore ${qualityScore} < ${env.THRESHOLD_QUALITY}`);
  }

  return { vector: normalized, liveness: livenessScore ?? null, quality: qualityScore ?? null };
}

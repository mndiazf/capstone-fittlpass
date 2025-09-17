import { BadRequest } from './httpErrors.js';
import { env } from '../config/env.js';

// Normaliza a norma L2 = 1 (recomendado para cosine)
export function normalize(vec) {
  const sumSq = vec.reduce((s, v) => s + v * v, 0);
  const norm = Math.sqrt(sumSq);
  if (!isFinite(norm) || norm === 0) {
    throw BadRequest('Embedding inválido: norma cero o no finita');
  }
  return vec.map(v => v / norm);
}

// convierte a literal SQL del tipo vector: '[0.1,0.2,...]'
export function toVectorLiteral(vec) {
  return `[${vec.join(',')}]`;
}

// valida dimensión
export function assertDims(vec) {
  if (!Array.isArray(vec)) throw BadRequest('Embedding debe ser un arreglo numérico');
  if (vec.length !== env.EMBEDDING_DIMS) {
    throw BadRequest(`Dimensión inválida: esperado ${env.EMBEDDING_DIMS}, recibido ${vec.length}`);
  }
  for (const v of vec) {
    if (typeof v !== 'number' || !isFinite(v)) throw BadRequest('Embedding contiene valores no numéricos');
  }
}

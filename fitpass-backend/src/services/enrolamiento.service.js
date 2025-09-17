import { withTx } from '../db/pool.js';
import { env } from '../config/env.js';
import { resolveEmbeddingAndScores } from './embedding.service.js';
import * as enrolRepo from '../repositories/enrolamiento.repository.js';
import * as embRepo from '../repositories/embedding.repository.js';
import { upsertPersona } from './persona.service.js';
import { ensureConsent } from './consentimiento.service.js';
import { audit } from './auditoria.service.js';
import { toVectorLiteral } from '../utils/vector.js';

export async function enrolarOneShotService(payload, ctx) {
  const { persona, consentimiento, fuente, requestId, sucursalId, deviceId } = payload;

  return await withTx(async (client) => {
    // 1) Persona (upsert) + bloqueo
    const p = await upsertPersona(client, persona);

    // 2) Consentimiento
    const consent = await ensureConsent(client, p.persona_id, consentimiento);

    // 3) Embedding + checks de liveness/quality
    const embRes = resolveEmbeddingAndScores(payload);

    // 4) Reemplazar VIGENTE anterior (si existe)
    await enrolRepo.replaceVigente(client, p.persona_id);

    // 5) Crear enrolamiento (VIGENTE)
    const enrol = await enrolRepo.insert(client, {
      personaId: p.persona_id,
      fuente,
      liveness: embRes.liveness,
      calidad: embRes.quality
    });

    // 6) Insert embedding normalizado
    await embRepo.insert(client, enrol.enrolamiento_id, toVectorLiteral(embRes.vector));

    // 7) Auditoría
    await audit(
      client,
      ctx.actorPersonaId,
      'ENROLAMIENTO_CREAR',
      'enrolamiento',
      String(enrol.enrolamiento_id),
      {
        requestId: requestId ?? null,
        sucursalId: sucursalId ?? null,
        deviceId: deviceId ?? null,
        liveness: embRes.liveness,
        quality: embRes.quality,
        fuente
      }
    );

    return {
      personaId: p.persona_id,
      consentId: consent?.consent_id ?? null,
      enrolamientoId: enrol.enrolamiento_id,
      estado: 'VIGENTE',
      thresholds: {
        sim: env.THRESHOLD_SIM,
        liveness: env.THRESHOLD_LIVENESS,
        quality: env.THRESHOLD_QUALITY
      }
    };
  });
}

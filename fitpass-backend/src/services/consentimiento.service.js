import * as consRepo from '../repositories/consentimiento.repository.js';

export async function ensureConsent(client, personaId, cto) {
  return await consRepo.insertIfNotExists(client, personaId, cto.versionPolitica, cto.ipOrigen ?? null);
}

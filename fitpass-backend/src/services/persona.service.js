import * as personaRepo from '../repositories/persona.repository.js';
import * as bloqueoRepo from '../repositories/bloqueo.repository.js';
import { Locked } from '../utils/httpErrors.js';

export async function upsertPersona(client, dto) {
  const existing = await personaRepo.findByRutOrEmail(client, dto.rut, dto.email);
  let persona;
  if (existing) {
    persona = await personaRepo.updateById(client, existing.persona_id, dto);
  } else {
    persona = await personaRepo.insert(client, dto);
  }
  const isBlocked = await bloqueoRepo.hasActive(client, persona.persona_id);
  if (isBlocked) throw Locked('La persona está bloqueada');
  return persona;
}

import * as audRepo from '../repositories/auditoria.repository.js';

export async function audit(client, actorPersonaId, accion, objeto, objetoId, detalle) {
  return await audRepo.insert(client, {
    actorPersonaId,
    accion,
    objeto,
    objetoId,
    detalleJson: detalle ? JSON.stringify(detalle) : null
  });
}

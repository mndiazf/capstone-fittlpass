export async function insert(client, { actorPersonaId, accion, objeto, objetoId, detalleJson }) {
  await client.query(
    `INSERT INTO auditoria (actor_persona_id, accion, objeto, objeto_id, detalle_json)
     VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [actorPersonaId, accion, objeto, objetoId, detalleJson]
  );
}

// Marca vigente anterior como REEMPLAZADO
export async function replaceVigente(client, personaId) {
  await client.query(
    `UPDATE enrolamiento
        SET estado = 'REEMPLAZADO'
      WHERE persona_id = $1
        AND estado = 'VIGENTE'`,
    [personaId]
  );
}

export async function insert(client, { personaId, fuente, liveness, calidad }) {
  const r = await client.query(
    `INSERT INTO enrolamiento (persona_id, estado, fuente, liveness_score, calidad_captura)
     VALUES ($1, 'VIGENTE', $2, $3, $4)
     RETURNING enrolamiento_id, persona_id, estado, creado_en`,
    [personaId, fuente, liveness, calidad]
  );
  return r.rows[0];
}

export async function hasActive(client, personaId) {
  const r = await client.query(
    `SELECT 1
       FROM bloqueo_persona
      WHERE persona_id = $1
        AND activo = true
        AND (hasta IS NULL OR hasta >= now())
      LIMIT 1`,
    [personaId]
  );
  return r.rowCount > 0;
}

export async function insertIfNotExists(client, personaId, versionPolitica, ipOrigen) {
  const r = await client.query(
    `INSERT INTO consentimiento_biometrico (persona_id, version_politica, ip_origen)
     VALUES ($1,$2,$3)
     ON CONFLICT (persona_id, version_politica) DO NOTHING
     RETURNING *`,
    [personaId, versionPolitica, ipOrigen]
  );
  return r.rows[0] ?? null; // null si ya existía
}

export async function findByRutOrEmail(client, rut, email) {
  if (rut) {
    const r = await client.query('SELECT * FROM persona WHERE rut = $1', [rut]);
    if (r.rowCount) return r.rows[0];
  }
  if (email) {
    const r = await client.query('SELECT * FROM persona WHERE email = $1', [email]);
    if (r.rowCount) return r.rows[0];
  }
  return null;
}

export async function insert(client, dto) {
  const r = await client.query(
    `INSERT INTO persona (tipo, rut, nombre, apellido, email, telefono)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [dto.tipo, dto.rut ?? null, dto.nombre, dto.apellido, dto.email ?? null, dto.telefono ?? null]
  );
  return r.rows[0];
}

export async function updateById(client, personaId, dto) {
  const r = await client.query(
    `UPDATE persona
       SET tipo = $2,
           rut = COALESCE($3, rut),
           nombre = $4,
           apellido = $5,
           email = COALESCE($6, email),
           telefono = COALESCE($7, telefono),
           fecha_mod = now()
     WHERE persona_id = $1
     RETURNING *`,
    [personaId, dto.tipo, dto.rut ?? null, dto.nombre, dto.apellido, dto.email ?? null, dto.telefono ?? null]
  );
  return r.rows[0];
}

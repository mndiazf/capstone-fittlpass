// vectorLiteral debe venir como '[0.1,0.2,...]'
export async function insert(client, enrolamientoId, vectorLiteral) {
  await client.query(
    `INSERT INTO embedding_facial (enrolamiento_id, emb)
     VALUES ($1, $2::vector)`,
    [enrolamientoId, vectorLiteral]
  );
}

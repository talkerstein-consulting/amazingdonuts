import pg from "pg";

export function createPool(connectionString) {
  const local = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  return new pg.Pool({ connectionString, ssl: local ? false : { rejectUnauthorized: true }, max: process.env.VERCEL ? 1 : 10 });
}

export async function transaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

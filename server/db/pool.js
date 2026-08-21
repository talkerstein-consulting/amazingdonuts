import pg from "pg";

const { Pool } = pg;

export function createPool(connectionString) {
  const isLocal = connectionString.includes("localhost");
  const databaseUrl = new URL(connectionString);
  if (!isLocal && ["prefer", "require", "verify-ca"].includes(databaseUrl.searchParams.get("sslmode"))) {
    databaseUrl.searchParams.set("sslmode", "verify-full");
  }

  return new Pool({
    connectionString: databaseUrl.toString(),
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });
}

export async function withTransaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

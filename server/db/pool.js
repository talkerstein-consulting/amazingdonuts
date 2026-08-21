import pg from "pg";

const { Pool } = pg;

export function createPool(connectionString) {
  const isLocal = connectionString.includes("localhost");
  const databaseUrl = new URL(connectionString);

  return new Pool({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 5432),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: decodeURIComponent(databaseUrl.pathname.slice(1)),
    ...(isLocal ? {} : {
      ssl: { rejectUnauthorized: true },
      enableChannelBinding: databaseUrl.searchParams.get("channel_binding") === "require"
    }),
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

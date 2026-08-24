import pg from "pg";

export function createPool(connectionString) {
  const local = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  const pool = new pg.Pool({ connectionString, ssl: local ? false : { rejectUnauthorized: true }, max: process.env.VERCEL ? 1 : 10 });
  const connect = async () => {
    const client = await pool.connect();
    try {
      await client.query("SET search_path TO house_accounts, public");
      return client;
    } catch (error) {
      client.release();
      throw error;
    }
  };
  return {
    connect,
    async query(...args) {
      const client = await connect();
      try { return await client.query(...args); }
      finally { client.release(); }
    },
    end: () => pool.end()
  };
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

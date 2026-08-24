import pg from "pg";

export function createPool(connectionString) {
  const local = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  const pool = new pg.Pool({ connectionString, ssl: local ? false : { rejectUnauthorized: true }, max: process.env.VERCEL ? 1 : 10 });
  const connect = () => pool.connect();
  return {
    connect,
    async query(...args) {
      const client = await connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL search_path TO house_accounts, public");
        const result = await client.query(...args);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      finally { client.release(); }
    },
    end: () => pool.end()
  };
}

export async function transaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path TO house_accounts, public");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

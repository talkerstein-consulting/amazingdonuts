import "dotenv/config";
import fs from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: true } });
const directory = new URL("./", import.meta.url);
const files = (await fs.readdir(directory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort();
for (const file of files) {
  const sql = await fs.readFile(new URL(file, directory), "utf8");
  await pool.query(sql);
}
await pool.end();
console.log("House-account schema is current.");

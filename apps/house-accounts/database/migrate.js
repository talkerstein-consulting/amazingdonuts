import "dotenv/config";
import fs from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: true } });
const sql = await fs.readFile(new URL("./001_initial.sql", import.meta.url), "utf8");
await pool.query(sql);
await pool.end();
console.log("House-account schema is current.");

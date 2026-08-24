import "dotenv/config";
import pg from "pg";
import { hashPassword } from "../apps/api/auth.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const password=process.env.SEED_ADMIN_PASSWORD;
if (!password || password.length<12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes("localhost")?false:{rejectUnauthorized:true},options:"-c search_path=house_accounts,public"});
const client=await pool.connect();
try {
  await client.query("BEGIN");
  const tenant=(await client.query(`INSERT INTO tenants(slug,name,domain,brand) VALUES('amazing-donuts','Amazing Donuts','accounts.amazingdonuts.com',$1) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,domain=EXCLUDED.domain,brand=EXCLUDED.brand RETURNING id`,[JSON.stringify({accent:"#d20a8c",ink:"#17394a"})])).rows[0];
  const user=(await client.query(`INSERT INTO users(email,password_hash,first_name,last_name) VALUES('licenses@talkerstein.ca',$1,'Raviv','Talkar') ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`,[await hashPassword(password)])).rows[0];
  await client.query(`INSERT INTO tenant_memberships(tenant_id,user_id,role) VALUES($1,$2,'owner') ON CONFLICT(tenant_id,user_id) DO UPDATE SET role='owner',status='active'`,[tenant.id,user.id]);
  await client.query("COMMIT"); console.log("Amazing Donuts tenant and owner seeded.");
} catch(error){await client.query("ROLLBACK");throw error;} finally{client.release();await pool.end();}

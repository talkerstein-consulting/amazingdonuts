import "dotenv/config";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes("localhost")?false:{rejectUnauthorized:true}});
const client=await pool.connect();
try {
  await client.query("BEGIN");
  const legacy=await client.query("SELECT email,password_hash,first_name,last_name,phone,status FROM public.retail_users WHERE lower(email)=lower($1) LIMIT 1",["licenses@talkerstein.ca"]);
  if(!legacy.rowCount) throw new Error("The existing owner login was not found.");
  const tenant=(await client.query(`INSERT INTO house_accounts.tenants(slug,name,domain,brand) VALUES('amazing-donuts','Amazing Donuts','accounts.amazingdonuts.com',$1) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,domain=EXCLUDED.domain,brand=EXCLUDED.brand,updated_at=now() RETURNING id`,[JSON.stringify({accent:"#d20a8c",ink:"#17394a"})])).rows[0];
  const row=legacy.rows[0];
  const user=(await client.query(`INSERT INTO house_accounts.users(email,password_hash,first_name,last_name,phone,status) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,phone=EXCLUDED.phone,status=EXCLUDED.status RETURNING id`,[row.email,row.password_hash,row.first_name,row.last_name,row.phone,row.status])).rows[0];
  await client.query(`INSERT INTO house_accounts.tenant_memberships(tenant_id,user_id,role,status) VALUES($1,$2,'owner','active') ON CONFLICT(tenant_id,user_id) DO UPDATE SET role='owner',status='active'`,[tenant.id,user.id]);
  await client.query("COMMIT"); console.log("Existing owner login imported into the house-account schema.");
} catch(error){await client.query("ROLLBACK");throw error;} finally{client.release();await pool.end();}

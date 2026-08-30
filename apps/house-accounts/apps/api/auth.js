import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const customerCookieName = "house_session";
export const adminCookieName = "house_admin_session";
const hashToken = (value) => createHash("sha256").update(value).digest("hex");

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(hash).toString("hex")}`;
}

export async function verifyPassword(password, encoded) {
  const [, salt, expectedHex] = String(encoded).split(":");
  if (!salt || !expectedHex) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function cookie(request, cookieName = customerCookieName) {
  const match = (request.get("cookie") || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  return match ? decodeURIComponent(match.slice(cookieName.length + 1)) : null;
}

export async function createSession(pool, response, userId, tenantId, secure, cookieName = customerCookieName) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  await pool.query("INSERT INTO sessions(user_id,tenant_id,token_hash,expires_at) VALUES($1,$2,$3,$4)", [userId,tenantId,hashToken(token),expiresAt]);
  response.cookie(cookieName, token, { httpOnly:true, secure, sameSite:"strict", path:"/", expires:expiresAt });
}

export async function loadSession(pool, request, cookieName = customerCookieName) {
  const token = cookie(request, cookieName);
  if (!token) return null;
  const result = await pool.query(`SELECT u.id,u.email,u.first_name,u.last_name,m.role,m.tenant_id,t.slug AS tenant_slug,t.name AS tenant_name,t.brand
    FROM sessions s JOIN users u ON u.id=s.user_id JOIN tenant_memberships m ON m.user_id=u.id AND m.tenant_id=s.tenant_id
    JOIN tenants t ON t.id=s.tenant_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active' AND m.status='active'`, [hashToken(token)]);
  return result.rows[0] || null;
}

export async function logout(pool, request, response, secure, cookieName = customerCookieName) {
  const token = cookie(request, cookieName);
  if (token) await pool.query("DELETE FROM sessions WHERE token_hash=$1", [hashToken(token)]);
  response.clearCookie(cookieName, { httpOnly:true, secure, sameSite:"strict", path:"/" });
}

export function requireUser(request) {
  if (!request.user) throw Object.assign(new Error("Please sign in."), { status:401, code:"AUTH_REQUIRED" });
  return request.user;
}

export function requireStaff(request) {
  const user = request.adminUser;
  if (!user) throw Object.assign(new Error("Administrator sign-in required."), { status:401, code:"ADMIN_AUTH_REQUIRED" });
  if (!["owner","staff"].includes(user.role)) throw Object.assign(new Error("Staff access required."), { status:403, code:"FORBIDDEN" });
  return user;
}

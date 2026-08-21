import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { AppError } from "../lib/errors.js";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "amazing_session";
const SESSION_DAYS = 30;

const tokenHash = (token) => createHash("sha256").update(token).digest("hex");

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, salt, expectedHex] = String(encoded).split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function cookieValue(request, name) {
  const cookie = request.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function createSession(pool, userId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await pool.query(
    `INSERT INTO retail_sessions (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
    [userId, tokenHash(token), expiresAt]
  );
  return { token, expiresAt };
}

export function setSessionCookie(response, session, secure) {
  response.cookie(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    expires: session.expiresAt
  });
}

export function clearSessionCookie(response, secure) {
  response.clearCookie(SESSION_COOKIE, { httpOnly: true, secure, sameSite: "strict", path: "/" });
}

export async function sessionUser(pool, request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const result = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.square_customer_id, u.status,
            s.id AS session_id
       FROM retail_sessions s
       JOIN retail_users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'active'`,
    [tokenHash(token)]
  );
  if (!result.rowCount) return null;
  pool.query("UPDATE retail_sessions SET last_seen_at = now() WHERE id = $1", [result.rows[0].session_id]).catch(() => {});
  return result.rows[0];
}

export function requireUser(request) {
  if (!request.user) throw new AppError(401, "AUTH_REQUIRED", "Please sign in to continue.");
  return request.user;
}

export async function deleteCurrentSession(pool, request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) await pool.query("DELETE FROM retail_sessions WHERE token_hash = $1", [tokenHash(token)]);
}

export const publicUser = (user) => user ? ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  phone: user.phone,
  hasSquareProfile: Boolean(user.square_customer_id)
}) : null;


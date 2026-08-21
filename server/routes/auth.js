import { Router } from "express";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { findOrCreateSquareCustomer } from "../services/customers.js";
import {
  clearSessionCookie,
  createSession,
  deleteCurrentSession,
  hashPassword,
  publicUser,
  requireUser,
  setSessionCookie,
  verifyPassword
} from "../services/auth.js";

const email = z.string().email().transform((value) => value.trim().toLowerCase());
const phone = z.string().regex(/^\+[1-9]\d{7,14}$/);
const credentials = z.object({ email, password: z.string().min(10).max(128) });
const registration = credentials.extend({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone
});

export function authRouter({ pool, square, config }) {
  const router = Router();
  const secure = config.NODE_ENV === "production";
  const clientUser = (user) => user ? { ...publicUser(user), isAdmin: config.ADMIN_EMAILS.includes(user.email) } : null;

  router.get("/auth/me", (request, response) => response.json({ user: clientUser(request.user) }));

  router.post("/auth/register", async (request, response, next) => {
    try {
      const input = registration.parse(request.body);
      const existing = await pool.query("SELECT 1 FROM retail_users WHERE email = $1", [input.email]);
      if (existing.rowCount) throw new AppError(409, "EMAIL_IN_USE", "An account already uses this email.");
      const squareCustomer = await findOrCreateSquareCustomer(square, {
        ...input,
        idempotencyKey: `retail-${crypto.randomUUID()}`
      });
      const result = await pool.query(
        `INSERT INTO retail_users (email, password_hash, first_name, last_name, phone, square_customer_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [input.email, await hashPassword(input.password), input.firstName, input.lastName, input.phone, squareCustomer.id]
      );
      const session = await createSession(pool, result.rows[0].id);
      setSessionCookie(response, session, secure);
      response.status(201).json({ user: clientUser(result.rows[0]) });
    } catch (error) { next(error); }
  });

  router.post("/auth/login", async (request, response, next) => {
    try {
      const input = credentials.parse(request.body);
      const result = await pool.query("SELECT * FROM retail_users WHERE email = $1 AND status = 'active'", [input.email]);
      if (!result.rowCount || !(await verifyPassword(input.password, result.rows[0].password_hash))) {
        throw new AppError(401, "INVALID_LOGIN", "The email or password is incorrect.");
      }
      const session = await createSession(pool, result.rows[0].id);
      setSessionCookie(response, session, secure);
      response.json({ user: clientUser(result.rows[0]) });
    } catch (error) { next(error); }
  });

  router.post("/auth/logout", async (request, response, next) => {
    try {
      await deleteCurrentSession(pool, request);
      clearSessionCookie(response, secure);
      response.status(204).end();
    } catch (error) { next(error); }
  });

  router.patch("/account/profile", async (request, response, next) => {
    try {
      const user = requireUser(request);
      const input = z.object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        phone
      }).parse(request.body);
      const result = await pool.query(
        `UPDATE retail_users SET first_name=$2,last_name=$3,phone=$4,updated_at=now() WHERE id=$1 RETURNING *`,
        [user.id, input.firstName, input.lastName, input.phone]
      );
      response.json({ user: clientUser(result.rows[0]) });
    } catch (error) { next(error); }
  });

  return router;
}

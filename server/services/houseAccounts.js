import { AppError } from "../lib/errors.js";
import { withTransaction } from "../db/pool.js";

export async function getAccountCredit(client, accountId) {
  const result = await client.query(
    `SELECT
       a.credit_limit_amount,
       a.status,
       COALESCE(SUM(l.amount), 0)::bigint AS balance,
       COALESCE((
         SELECT SUM(r.amount) FROM credit_reservations r
         WHERE r.account_id = a.id AND r.status = 'active'
       ), 0)::bigint AS reserved
     FROM b2b_accounts a
     LEFT JOIN ledger_entries l ON l.account_id = a.id
     WHERE a.id = $1
     GROUP BY a.id`,
    [accountId]
  );
  if (!result.rowCount) throw new AppError(404, "ACCOUNT_NOT_FOUND", "House Account not found.");
  const row = result.rows[0];
  const creditLimit = Number(row.credit_limit_amount);
  const balance = Number(row.balance);
  const reserved = Number(row.reserved);
  return {
    status: row.status,
    creditLimit,
    balance,
    reserved,
    available: creditLimit - balance - reserved
  };
}

export async function reserveCredit(pool, { accountId, orderId, amount, expiresAt }) {
  return withTransaction(pool, async (client) => {
    await client.query("SELECT id FROM b2b_accounts WHERE id = $1 FOR UPDATE", [accountId]);
    const credit = await getAccountCredit(client, accountId);
    if (credit.status !== "active") {
      throw new AppError(409, "ACCOUNT_INACTIVE", "This House Account is not active.");
    }
    if (amount <= 0 || amount > credit.available) {
      throw new AppError(409, "CREDIT_LIMIT_EXCEEDED", "The order exceeds available credit.", {
        requested: amount,
        available: credit.available
      });
    }

    const result = await client.query(
      `INSERT INTO credit_reservations (account_id, b2b_order_id, amount, expires_at)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [accountId, orderId, amount, expiresAt || null]
    );
    return result.rows[0];
  });
}

import { transaction } from "./db.js";

export async function accountCredit(client, accountId) {
  const result = await client.query(`SELECT a.credit_limit,
    COALESCE((SELECT SUM(p.amount) FROM journal_postings p WHERE p.account_id=a.id AND p.ledger_account='accounts_receivable'),0)::bigint AS balance,
    COALESCE((SELECT SUM(r.amount) FROM credit_reservations r WHERE r.account_id=a.id AND r.status='active'),0)::bigint AS reserved
    FROM accounts a WHERE a.id=$1`, [accountId]);
  if (!result.rowCount) throw Object.assign(new Error("Account not found."), { status:404 });
  const row = result.rows[0];
  const creditLimit = Number(row.credit_limit), balance = Number(row.balance), reserved = Number(row.reserved);
  return { creditLimit, balance, reserved, available:creditLimit-balance-reserved };
}

export async function reserveCredit(pool, { accountId, amount, idempotencyKey }) {
  return transaction(pool, async (client) => {
    await client.query("SELECT id FROM accounts WHERE id=$1 FOR UPDATE", [accountId]);
    const credit = await accountCredit(client, accountId);
    if (amount > credit.available) throw Object.assign(new Error("The order exceeds available credit."), { status:409, code:"CREDIT_LIMIT_EXCEEDED", details:{ amount, available:credit.available } });
    return (await client.query(`INSERT INTO credit_reservations(account_id,amount,idempotency_key,expires_at) VALUES($1,$2,$3,now()+interval '30 minutes') RETURNING *`, [accountId,amount,idempotencyKey])).rows[0];
  });
}

export async function postSale(client, { tenantId, accountId, orderId, amount, currency, description, actorId }) {
  const journal = await client.query(`INSERT INTO journal_transactions(tenant_id,account_id,transaction_type,source_type,source_id,description,effective_at,created_by)
    VALUES($1,$2,'sale','square_order',$3,$4,now(),$5) ON CONFLICT(tenant_id,source_type,source_id,transaction_type) DO NOTHING RETURNING id`, [tenantId,accountId,orderId,description,actorId]);
  if (journal.rowCount) await client.query(`INSERT INTO journal_postings(transaction_id,account_id,ledger_account,amount,currency) VALUES($1,$2,'accounts_receivable',$3,$4)`, [journal.rows[0].id,accountId,amount,currency]);
  return journal.rows[0]?.id || null;
}

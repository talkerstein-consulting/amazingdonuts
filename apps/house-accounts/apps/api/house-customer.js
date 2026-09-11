import { createHash } from 'node:crypto';
import { transaction } from './db.js';

export async function resolveHouseCustomer(square, account) {
  if (account.square_customer_id) {
    try {
      const { customer } = await square.retrieveCustomer(account.square_customer_id);
      if (!customer?.id) throw new Error('Square returned an incomplete customer.');
      return customer.id;
    } catch (error) {
      if (error.status !== 404 || !error.details?.some(item => item.code === 'NOT_FOUND')) throw error;
    }
  }
  // A stable key also recovers a successful Square write if the database commit fails.
  const key = createHash('sha256').update(JSON.stringify([square.baseUrl, account.tenant_id, account.id, account.square_customer_id || 'new'])).digest('hex');
  const { customer } = await square.createCustomer({
    idempotency_key: key,
    company_name: account.organization_name,
    given_name: account.first_name,
    family_name: account.last_name,
    email_address: account.billing_email || undefined,
    reference_id: account.id,
  });
  if (!customer?.id) throw new Error('Square returned an incomplete customer.');
  return customer.id;
}

export async function ensureProfileCustomer(pool, square, tenantId, userId) {
  return transaction(pool, async client => {
    const user = (await client.query(`SELECT u.id,u.first_name,u.last_name,u.email,cp.square_customer_id
      FROM users u JOIN tenant_memberships tm ON tm.user_id=u.id AND tm.tenant_id=$1
      LEFT JOIN customer_profiles cp ON cp.user_id=u.id AND cp.tenant_id=$1
      WHERE u.id=$2 FOR UPDATE OF u`, [tenantId,userId])).rows[0];
    if (!user) throw Object.assign(new Error('Customer membership not found.'), {status:404});
    const id = await resolveHouseCustomer(square, {...user,id:`profile-${userId}`,tenant_id:tenantId,billing_email:user.email});
    await client.query(`INSERT INTO customer_profiles(tenant_id,user_id,square_customer_id) VALUES($1,$2,$3)
      ON CONFLICT(tenant_id,user_id) DO UPDATE SET square_customer_id=EXCLUDED.square_customer_id,updated_at=now()`, [tenantId,userId,id]);
    return id;
  });
}

export async function ensureHouseCustomer(pool, square, tenantId, accountId) {
  return transaction(pool, async client => {
    const account = (await client.query('SELECT * FROM accounts WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [accountId, tenantId])).rows[0];
    if (!account) throw Object.assign(new Error('Institutional account not found.'), {status:404});
    const id = await resolveHouseCustomer(square, account);
    if (id !== account.square_customer_id) {
      await client.query('UPDATE accounts SET square_customer_id=$3,updated_at=now() WHERE id=$1 AND tenant_id=$2', [accountId, tenantId, id]);
    }
    return id;
  });
}

export async function assertHouseCard(square, cardId, customerId) {
  let card;
  try { ({card} = await square.request(`/v2/cards/${encodeURIComponent(cardId)}`)); }
  catch (error) {
    if (error.status !== 404 || !error.details?.some(item => item.code === 'NOT_FOUND')) throw error;
  }
  if (!card?.enabled || card.customer_id !== customerId) throw Object.assign(new Error('Your institutional account is linked to Square. Please add a card on file for this payment environment before using account credit.'), {status:409, code:'CARD_ON_FILE_REQUIRED'});
}

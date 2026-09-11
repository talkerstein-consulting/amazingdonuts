export async function findSquareCustomers(square, email) {
  const result = await square.searchCustomers({query:{filter:{email_address:{exact:String(email).toLowerCase()}}},limit:100});
  return (result.customers || []).filter(customer => String(customer.email_address || '').toLowerCase() === String(email).toLowerCase());
}

export async function findOrCreateGuestCustomer(square, guest, idempotencyKey) {
  const customers = await findSquareCustomers(square, guest.email);
  if (customers.length) return {customer:customers[0], customerIds:customers.map(customer => customer.id)};
  const customer = (await square.createCustomer({
    idempotency_key:`guest-${idempotencyKey}`,
    given_name:guest.firstName,
    family_name:guest.lastName || undefined,
    email_address:String(guest.email).toLowerCase(),
    phone_number:guest.phone || undefined,
  })).customer;
  return {customer,customerIds:[customer.id]};
}

export async function attachGuestOrders(client, tenantId, userId, customerIds, legacyEmail='') {
  if (!customerIds.length && !legacyEmail) return 0;
  const result = await client.query(`UPDATE storefront_orders SET user_id=$2,guest_contact=NULL
    WHERE tenant_id=$1 AND user_id IS NULL AND (
      guest_contact->>'squareCustomerId'=ANY($3::text[])
      OR ($4<>'' AND lower(guest_contact->>'email')=lower($4))
      OR raw_square->'order'->>'customer_id'=ANY($3::text[])
    )`,[tenantId,userId,customerIds,legacyEmail]);
  return result.rowCount;
}

export const guestOrderReference = customerId => ({squareCustomerId:customerId});
export const guestFulfillmentReference = fulfillment => ({type:fulfillment.type,scheduledAt:fulfillment.scheduledAt});

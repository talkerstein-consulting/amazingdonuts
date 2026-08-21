export async function findOrCreateSquareCustomer(square, customer) {
  const filters = [
    customer.email ? { email_address: { exact: customer.email } } : null,
    customer.phone ? { phone_number: { exact: customer.phone } } : null
  ].filter(Boolean);

  for (const filter of filters) {
    const result = await square.searchCustomers(filter);
    if (result.customers?.length) return result.customers[0];
  }

  const created = await square.createCustomer({
    idempotency_key: customer.idempotencyKey,
    given_name: customer.firstName,
    family_name: customer.lastName,
    email_address: customer.email,
    phone_number: customer.phone,
    ...(customer.address ? { address: customer.address } : {})
  });
  return created.customer;
}

export function normalizePromoCode(code) {
  return String(code || '').trim().toUpperCase();
}

export async function squareDiscounts(square) {
  const discounts = [];
  let cursor;
  do {
    const page = await square.request('/v2/catalog/list', { query: { types: 'DISCOUNT', cursor } });
    discounts.push(...(page.objects || []).filter(item => item.type === 'DISCOUNT' && !item.is_deleted && ['FIXED_PERCENTAGE', 'FIXED_AMOUNT'].includes(item.discount_data?.discount_type)).map(item => ({
      id: item.id,
      name: item.discount_data?.name || item.id,
      type: item.discount_data?.discount_type,
      percentage: item.discount_data?.percentage || null,
      amount: item.discount_data?.amount_money?.amount ?? null
    })));
    cursor = page.cursor;
  } while (cursor);
  return discounts;
}

export async function resolvePromoCode(pool, square, tenantId, code) {
  const normalized = normalizePromoCode(code);
  if (!normalized) return null;
  const result = await pool.query('SELECT square_discount_id FROM storefront_promo_codes WHERE tenant_id=$1 AND code=$2 AND active=TRUE', [tenantId, normalized]);
  if (!result.rowCount) throw Object.assign(new Error('This promo code is unavailable.'), { status: 400, code: 'PROMO_UNAVAILABLE' });
  const id = result.rows[0].square_discount_id;
  const discount = (await square.request(`/v2/catalog/object/${encodeURIComponent(id)}`)).object;
  if (!discount || discount.type !== 'DISCOUNT' || discount.is_deleted || !['FIXED_PERCENTAGE', 'FIXED_AMOUNT'].includes(discount.discount_data?.discount_type)) throw Object.assign(new Error('This promo code is unavailable.'), { status: 400, code: 'PROMO_UNAVAILABLE' });
  return { code: normalized, catalogObjectId: id, name: discount.discount_data?.name || normalized };
}

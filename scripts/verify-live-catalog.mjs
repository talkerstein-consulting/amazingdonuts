import assert from 'node:assert/strict';
import { PRODUCTS } from '../src/data/products.ts';

// Read-only release check: catalog reads and Square price calculations, never payments or orders.
const base = process.env.VERIFY_API_URL || 'http://127.0.0.1:5173/api/house';
const request = async (path, body) => {
  const response = await fetch(`${base}${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const data = await response.json();
  assert.equal(response.status, 200, `${path}: ${data.error?.message || response.status}`);
  return data;
};
const { products } = await request('/storefront/catalog');
const missing = PRODUCTS.filter(product => !products.some(live => live.name.toLowerCase() === product.name.toLowerCase()));
assert.deepEqual(missing.map(product => product.name), []);
const scheduled = new Date(Date.now() + 8 * 86400000);
while (scheduled.getUTCDay() !== 1) scheduled.setUTCDate(scheduled.getUTCDate() + 1);
scheduled.setUTCHours(14, 0, 0, 0);
const fulfillment = { type: 'pickup', scheduledAt: scheduled.toISOString(), recipient: { displayName: 'Catalog QA', email: 'catalog-qa@example.com', phone: '4165550123' } };
for (const [name, size] of [['Build your own half dozen', 6], ['Build your own dozen', 12]]) {
  const product = products.find(item => item.name === name);
  assert.equal(product.available, true);
  assert.ok(product.boxFlavours?.length);
  const result = await request('/public/storefront/quote', {
    items: [{ name, quantity: 1 }],
    customizations: [{ productName: name, kind: 'box', donuts: Array(size).fill(product.boxFlavours[0]) }], fulfillment
  });
  assert.ok(result.order.total >= product.price);
  console.log(JSON.stringify({ name, price: product.price, total: result.order.total, flavours: product.boxFlavours.length }));
}
const names = ['Banana Muffin', 'Chocolate Cupcake', 'Brownie Square', 'Bulka Challah (special order)', 'Glazed Donut'];
for (const name of names) assert.equal(products.find(item => item.name === name)?.available, true, name);
const result = await request('/public/storefront/quote', { items: names.map(name => ({ name, quantity: 1 })), fulfillment });
assert.ok(result.order.total > 0);
for (const quantity of [1, 6, 12]) {
  const lab = await request('/public/storefront/quote', { items: [{ name: 'Donut lab donut', quantity }], customizations: [{ productName: 'Donut lab donut', kind: 'lab', elements: [{ label: 'Shape', value: 'Round Donut' }, { label: 'Icing', value: 'Pink' }, { label: 'Sprinkles', value: 'Rainbow' }] }], fulfillment });
  assert.equal(lab.order.subtotal, quantity * 200);
  console.log(JSON.stringify({ labQuantity: quantity, subtotal: lab.order.subtotal, total: lab.order.total }));
}
console.log(JSON.stringify({ matchedStorefrontProducts: PRODUCTS.length, catalogCount: products.length, mixedCategoryQuote: result.order.total }));

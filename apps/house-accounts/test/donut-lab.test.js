import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSquareOrder } from '../apps/api/app.js';
import { labCustomizationSchema, labOrderNote, LAB_NAME } from '../apps/api/donut-lab.js';
import { lineKeyOf } from '../../../src/lib/cart-line.ts';

const design = value => ({ productName: LAB_NAME, kind: 'lab', elements: [{ label: 'Shape', value: 'Round Donut', price: 0.25 }, { label: 'Icing', value, price: 999 }] });
test('Lab designs are validated and client-provided prices are discarded', () => {
  assert.equal(labCustomizationSchema.parse(design('Pink')).elements[0].price, undefined);
  assert.throws(() => labCustomizationSchema.parse({ ...design('Pink'), elements: [{ label: 'Icing', value: 'Pink' }] }));
  assert.throws(() => labOrderNote(LAB_NAME, undefined), { code: 'LAB_DESIGN_REQUIRED' });
  assert.throws(() => labOrderNote('Glazed Donut', design('Pink')), { code: 'LAB_DESIGN_REQUIRED' });
});
test('different Lab designs remain separate and use the Square catalog price', async () => {
  const product = { id: 'donut-lab-donut' };
  assert.notEqual(lineKeyOf({ product, customization: design('Pink') }), lineKeyOf({ product, customization: design('Blue') }));
  const objects = [{ type: 'ITEM', item_data: { name: LAB_NAME, variations: [{ id: 'LAB-VARIATION', item_variation_data: { price_money: { amount: 200, currency: 'CAD' } } }] } }];
  const order = await buildSquareOrder({ request: async () => ({ objects }) }, 'LOCATION', {
    items: [{ name: LAB_NAME, quantity: 6 }, { name: LAB_NAME, quantity: 12 }], customizations: [design('Pink'), design('Blue')],
    fulfillment: { type: 'pickup', scheduledAt: '2026-10-05T14:00:00Z', recipient: { displayName: 'Test Customer', email: 'test@example.com', phone: '4165550123' } }
  }, null);
  assert.deepEqual(order.line_items.map(line => line.quantity), ['6','12']);
  assert.match(order.line_items[0].note, /Icing: Pink/);
  assert.match(order.line_items[1].note, /Icing: Blue/);
  for (const line of order.line_items) {
    assert.equal(line.catalog_object_id, 'LAB-VARIATION');
    assert.equal(line.base_price_money, undefined);
    assert.equal(line.modifiers, undefined);
  }
});

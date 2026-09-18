import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePromoCode, resolvePromoCode, squareDiscounts } from '../apps/api/promo-codes.js';

test('promo codes normalize case and whitespace', () => {
  assert.equal(normalizePromoCode('  friday10  '), 'FRIDAY10');
});

test('admin discount list reads Square DISCOUNT objects', async () => {
  const calls = [];
  const square = { request: async (path, options) => { calls.push([path, options.query]); return { objects: [{ id: 'discount-1', type: 'DISCOUNT', discount_data: { name: '10% off', discount_type: 'FIXED_PERCENTAGE', percentage: '10' } }, { id: 'deleted', type: 'DISCOUNT', is_deleted: true }] }; } };
  assert.deepEqual(await squareDiscounts(square), [{ id: 'discount-1', name: '10% off', type: 'FIXED_PERCENTAGE', percentage: '10', amount: null }]);
  assert.equal(calls[0][1].types, 'DISCOUNT');
});

test('active promo resolves to its current Square catalog discount', async () => {
  const pool = { query: async (_sql, values) => { assert.deepEqual(values, ['tenant-1', 'SAVE10']); return { rowCount: 1, rows: [{ square_discount_id: 'discount-1' }] }; } };
  const square = { request: async path => { assert.equal(path, '/v2/catalog/object/discount-1'); return { object: { id: 'discount-1', type: 'DISCOUNT', discount_data: { name: '10% off', discount_type: 'FIXED_PERCENTAGE' } } }; } };
  assert.deepEqual(await resolvePromoCode(pool, square, 'tenant-1', 'save10'), { code: 'SAVE10', catalogObjectId: 'discount-1', name: '10% off' });
});

test('unknown promo is rejected before Square pricing', async () => {
  const pool = { query: async () => ({ rowCount: 0, rows: [] }) };
  await assert.rejects(resolvePromoCode(pool, { request: () => { throw new Error('unreachable'); } }, 'tenant-1', 'NOPE'), /unavailable/);
});

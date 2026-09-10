import { randomUUID } from 'node:crypto';
import { SquareAdapter } from '../apps/house-accounts/packages/square/client.js';
import { LAB_NAME } from '../apps/house-accounts/apps/api/donut-lab.js';

const environment = process.env.SQUARE_ENVIRONMENT;
const locationId = process.env.SQUARE_LOCATION_ID;
if (!['production', 'sandbox'].includes(environment) || !locationId || !process.env.SQUARE_ACCESS_TOKEN) throw new Error('Explicit Square environment, token, and location are required.');
const square = new SquareAdapter({ environment, accessToken: process.env.SQUARE_ACCESS_TOKEN, apiVersion: '2026-07-15' });
let cursor, objects = [];
do {
  const page = await square.request('/v2/catalog/list', { query: { types: 'ITEM', ...(cursor ? { cursor } : {}) } });
  objects.push(...page.objects || []);
  cursor = page.cursor;
} while (cursor);
const matches = objects.filter(item => !item.is_deleted && (item.item_data?.name.toLowerCase() === LAB_NAME.toLowerCase() || item.item_data?.variations?.some(v => v.item_variation_data.sku === 'donut-lab-donut')));
if (matches.length) {
  if (matches.length !== 1 || matches[0].item_data.variations[0].item_variation_data.price_money?.amount !== 200) throw new Error('Existing Donut Lab item requires review; no changes made.');
  console.log(JSON.stringify({ environment, existing: matches[0].id, name: LAB_NAME, price: 200 }));
} else {
  const template = objects.find(item => item.item_data?.name === 'Glazed Donut' && !item.is_deleted);
  if (!template) throw new Error('Glazed Donut template missing; no changes made.');
  const source = template.item_data;
  const item = { type: 'ITEM', id: '#donut-lab-donut', present_at_all_locations: false, present_at_location_ids: [locationId], item_data: {
    name: LAB_NAME, description: 'Made-to-order Donut Lab design. Choices are provided in the order preparation notes.', kitchen_name: 'DONUT LAB', product_type: 'FOOD_AND_BEV',
    is_taxable: source.is_taxable, tax_ids: source.tax_ids, categories: source.categories?.map(({id}) => ({id})), reporting_category: source.reporting_category ? { id: source.reporting_category.id } : undefined, channels: source.channels,
    variations: [{ type: 'ITEM_VARIATION', id: '#donut-lab-regular', present_at_all_locations: false, present_at_location_ids: [locationId], item_variation_data: {
      item_id: '#donut-lab-donut', name: 'One donut', sku: 'donut-lab-donut', pricing_type: 'FIXED_PRICING', price_money: { amount: 200, currency: 'CAD' }, sellable: true, stockable: true, track_inventory: false, channels: source.channels
    } }]
  } };
  console.log(JSON.stringify({ environment, name: LAB_NAME, price: 200, apply: process.argv.includes('--apply') }));
  if (process.argv.includes('--apply')) {
    const result = await square.request('/v2/catalog/batch-upsert', { method: 'POST', body: { idempotency_key: randomUUID(), batches: [{ objects: [item] }] } });
    console.log(JSON.stringify({ created: result.objects?.map(object => ({ id: object.id, name: object.item_data?.name })) }));
  }
}

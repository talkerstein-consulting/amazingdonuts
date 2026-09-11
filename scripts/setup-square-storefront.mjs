import { randomUUID } from 'node:crypto';
import { SquareAdapter } from '../apps/house-accounts/packages/square/client.js';
import { DONUT_BOXES } from '../apps/house-accounts/apps/api/donut-boxes.js';
import { LAB_NAME } from '../apps/house-accounts/apps/api/donut-lab.js';
import { availableAtLocation, variationAtLocation } from '../apps/house-accounts/apps/api/catalog-availability.js';
import { PRODUCTS } from '../src/data/products.ts';

const environment = process.env.SQUARE_ENVIRONMENT;
const locationId = process.env.SQUARE_LOCATION_ID;
if (!['production', 'sandbox'].includes(environment) || !locationId || !process.env.SQUARE_ACCESS_TOKEN) {
  throw new Error('Explicit Square environment, token, and location are required.');
}

const square = new SquareAdapter({ environment, accessToken: process.env.SQUARE_ACCESS_TOKEN, apiVersion: '2026-07-15' });
let cursor;
const objects = [];
do {
  const page = await square.request('/v2/catalog/list', { query: { types: 'ITEM,CATEGORY', ...(cursor ? { cursor } : {}) } });
  objects.push(...(page.objects || []));
  cursor = page.cursor;
} while (cursor);

const activeItems = objects.filter(object => object.type === 'ITEM' && !object.is_deleted && !object.item_data?.is_archived);
const byName = name => activeItems.find(item => item.item_data?.name?.toLowerCase() === name.toLowerCase());
const boxNames = new Set(DONUT_BOXES.map(box => box.name));
const storefrontProducts = PRODUCTS.filter(product => product.name !== LAB_NAME && !boxNames.has(product.name));
const missing = storefrontProducts.filter(product => !byName(product.name));

const templates = new Map();
for (const product of storefrontProducts) {
  const item = byName(product.name);
  const variation = item && variationAtLocation(item, locationId);
  if (item && variation && availableAtLocation(item, variation, locationId) && !templates.has(product.category)) {
    templates.set(product.category, item);
  }
}

const additions = missing.map(product => {
  const template = templates.get(product.category);
  if (!template) throw new Error(`No available ${product.category} template exists for ${product.name}.`);
  const itemId = `#storefront-${product.id}`;
  const amount = Math.round(Number(product.price.replace(/[^0-9.]/g, '')) * 100);
  return {
    type: 'ITEM', id: itemId, present_at_all_locations: false, present_at_location_ids: [locationId],
    item_data: {
      name: product.name,
      description: `Amazing Donuts storefront item: ${product.name}.`,
      product_type: template.item_data.product_type || 'FOOD_AND_BEV',
      is_taxable: template.item_data.is_taxable,
      ...(template.item_data.tax_ids?.length ? { tax_ids: template.item_data.tax_ids } : {}),
      ...(template.item_data.categories?.length ? { categories: template.item_data.categories.map(({ id }) => ({ id })) } : {}),
      ...(template.item_data.reporting_category?.id ? { reporting_category: { id: template.item_data.reporting_category.id } } : {}),
      ...(template.item_data.channels?.length ? { channels: template.item_data.channels } : {}),
      variations: [{
        type: 'ITEM_VARIATION', id: `${itemId}-regular`, present_at_all_locations: false, present_at_location_ids: [locationId],
        item_variation_data: {
          item_id: itemId, name: 'Regular', sku: product.id, pricing_type: 'FIXED_PRICING',
          price_money: { amount, currency: 'CAD' }, sellable: true, stockable: true, track_inventory: false,
          ...(template.item_data.channels?.length ? { channels: template.item_data.channels } : {})
        }
      }]
    }
  };
});

console.log(JSON.stringify({ environment, locationId, missing: missing.map(({ name, price, category }) => ({ name, price, category })), apply: process.argv.includes('--apply') }, null, 2));
if (process.argv.includes('--apply') && additions.length) {
  const result = await square.request('/v2/catalog/batch-upsert', {
    method: 'POST',
    body: { idempotency_key: randomUUID(), batches: [{ objects: additions }] }
  });
  console.log(JSON.stringify({ created: result.objects?.map(item => ({ id: item.id, name: item.item_data?.name })) }, null, 2));
}

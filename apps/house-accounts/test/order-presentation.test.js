import test from 'node:test';
import assert from 'node:assert/strict';
import { customerOrder, websiteTaxes } from '../apps/api/order-presentation.js';

test('13% HST is the fallback, without doubling catalog taxes', () => {
  const fallback = websiteTaxes([]);
  assert.equal(fallback.taxes[0].percentage, '13');
  assert.equal(fallback.pricing_options.auto_apply_taxes, false);
  const configured = websiteTaxes([{ id: 'tax' }]);
  assert.equal(configured.taxes, undefined);
  assert.equal(configured.pricing_options.auto_apply_taxes, true);
});

const row = { status:'completed', payment_method:'card', subtotal:1000, tax:0, total:1000, fulfillment:{type:'delivery',scheduledAt:'2026-09-11T16:00:00Z'}, raw_square:{payment:{status:'COMPLETED'},order:{total_service_charge_money:{amount:800},fulfillments:[{state:'PROPOSED'}]}} };
test('paid is not delivered; historical tax is not recalculated', () => {
  const order = customerOrder(row);
  assert.equal(order.paymentStatus, 'Paid');
  assert.equal(order.fulfillmentStatus, 'Order received');
  assert.equal(order.breakdown.merchandise,200);
  assert.equal(order.breakdown.deliveryFee,800);
  assert.equal(order.breakdown.tax,0);
  assert.equal(order.raw_square,undefined);
});
test('courier failure, live fulfillment and courier progress are distinct', () => {
  assert.equal(customerOrder({...row,delivery:{status:'dispatch_failed'}}).fulfillmentStatus,'Delivery dispatch failed');
  assert.equal(customerOrder(row,{fulfillments:[{state:'COMPLETED'}]}).fulfillmentStatus,'Delivered');
  assert.equal(customerOrder({...row,delivery:{status:'dropoff'}}).fulfillmentStatus,'Out for delivery');
});
test('breakdown reconciles tax, discount, fee and tip', () => {
  const order=customerOrder(row,{total_money:{amount:1330},total_tax_money:{amount:130},total_discount_money:{amount:100},total_service_charge_money:{amount:800},total_tip_money:{amount:200}});
  const b=order.breakdown;
  assert.equal(b.merchandise-b.discount+b.deliveryFee+b.tax+b.tip,b.total);
});
test('Square ready pickup is shown separately from a completed payment', () => {
  const pickup = {...row, fulfillment:{type:'pickup'}};
  const ready = customerOrder(pickup, {fulfillments:[{type:'PICKUP',state:'PREPARED'}]});
  assert.equal(ready.fulfillmentStatus, 'Ready for pickup');
  assert.equal(ready.paymentStatus, 'Paid');
  assert.equal(ready.liveStatusAvailable, true);
  assert.equal(customerOrder(pickup,{fulfillments:[{state:'COMPLETED'}]}).fulfillmentStatus,'Collected');
});

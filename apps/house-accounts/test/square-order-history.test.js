import test from 'node:test';
import assert from 'node:assert/strict';
import { squareCustomerOrderHistory, squareOrderRow } from '../apps/api/square-order-history.js';

const counterOrder = {
  id:'counter-order', state:'COMPLETED', created_at:'2026-09-14T14:39:07.164Z',
  total_money:{amount:275,currency:'CAD'}, total_tax_money:{amount:32},
  line_items:[{uid:'line',name:'Apple Cinnamon Muffin',quantity:'1',total_money:{amount:275}}],
  tenders:[{id:'cash-payment',type:'CASH'}]
};

test('Square counter orders become customer dashboard orders', () => {
  const row=squareOrderRow(counterOrder,[{id:'cash-payment',status:'COMPLETED',source_type:'CASH',amount_money:{amount:275,currency:'CAD'}}]);
  assert.equal(row.payment_method,'cash');
  assert.equal(row.line_items[0].name,'Apple Cinnamon Muffin');
  assert.equal(row.total,275);
});

test('history searches every exact customer match and reports live refunds', async () => {
  const searched=[];
  const square={
    searchOrders:async body=>{searched.push(...body.query.filter.customer_filter.customer_ids);return {orders:[counterOrder]};},
    retrievePayment:async()=>({payment:{id:'cash-payment',status:'COMPLETED',source_type:'CASH',amount_money:{amount:275,currency:'CAD'},refunded_money:{amount:275}}})
  };
  const orders=await squareCustomerOrderHistory(square,{customerIds:['customer-a','customer-b'],locationId:'location'});
  assert.deepEqual(searched,['customer-a','customer-b']);
  assert.equal(orders.length,1);
  assert.equal(orders[0].paymentStatus,'Refunded');
  assert.equal(orders[0].fulfillmentStatus,'Completed');
});

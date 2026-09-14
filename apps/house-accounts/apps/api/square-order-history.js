import { customerOrder } from './order-presentation.js';

const unique = values => [...new Set(values.filter(Boolean))];
const chunks = (values, size) => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));

export const squarePaymentIds = order => unique((order?.tenders || []).map(tender => tender.payment_id || tender.id));

export function squarePaymentMethod(order, payments = []) {
  const source = payments.find(payment => payment?.source_type)?.source_type || order?.tenders?.[0]?.type || 'CARD';
  return String(source).toLowerCase();
}

export function squareOrderRow(order, payments = []) {
  const fulfillment = order.fulfillments?.[0];
  const type = fulfillment?.type ? String(fulfillment.type).toLowerCase() : null;
  const scheduledAt = fulfillment?.delivery_details?.deliver_at || fulfillment?.pickup_details?.pickup_at || null;
  const total = Number(order.total_money?.amount || 0);
  const tax = Number(order.total_tax_money?.amount || 0);
  const payment = payments[0];
  return {
    id: `square-${order.id}`,
    square_order_id: order.id,
    square_payment_id: payment?.id || squarePaymentIds(order)[0] || null,
    payment_method: squarePaymentMethod(order, payments),
    status: String(payment?.status || order.state || 'completed').toLowerCase(),
    subtotal: total - tax,
    tax,
    total,
    currency: order.total_money?.currency || payment?.amount_money?.currency || 'CAD',
    fulfillment: type ? { type, ...(scheduledAt ? { scheduledAt } : {}) } : null,
    line_items: order.line_items || [],
    ordered_at: order.created_at || order.closed_at || order.updated_at,
    raw_square: { order, payment },
    delivery: null
  };
}

async function retrievePayments(square, ids, concurrency = 8) {
  const result = new Map();
  for (let index = 0; index < ids.length; index += concurrency) {
    await Promise.all(ids.slice(index, index + concurrency).map(async id => {
      try {
        const payment = (await square.retrievePayment(id)).payment;
        if (payment) result.set(id, payment);
      } catch (error) {
        console.error('Square payment refresh failed', String(id).slice(-8), error.message);
      }
    }));
  }
  return result;
}

export async function squareCustomerOrderHistory(square, { customerIds, locationId, storedRows = [], limit = 100 }) {
  const ids = unique(customerIds);
  const liveById = new Map();
  for (const customerIdBatch of chunks(ids, 10)) {
    const page = await square.searchOrders({
      location_ids: [locationId],
      query: {
        filter: { customer_filter: { customer_ids: customerIdBatch } },
        sort: { sort_field: 'CREATED_AT', sort_order: 'DESC' }
      },
      limit,
      return_entries: false
    });
    for (const order of page.orders || []) liveById.set(order.id, order);
  }

  const liveOrders = [...liveById.values()]
    .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())
    .slice(0, limit);

  const paymentIds = unique([
    ...storedRows.map(row => row.square_payment_id),
    ...liveOrders.flatMap(squarePaymentIds)
  ]);
  const payments = await retrievePayments(square, paymentIds);
  const storedByOrderId = new Map(storedRows.map(row => [row.square_order_id, row]));
  const merged = [];

  for (const order of liveOrders) {
    const stored = storedByOrderId.get(order.id);
    const livePayments = unique([...squarePaymentIds(order), stored?.square_payment_id]).map(id => payments.get(id)).filter(Boolean);
    merged.push(customerOrder(stored || squareOrderRow(order, livePayments), order, livePayments));
    storedByOrderId.delete(order.id);
  }
  for (const row of storedByOrderId.values()) {
    const payment = payments.get(row.square_payment_id);
    merged.push(customerOrder(row, null, payment ? [payment] : []));
  }

  return merged
    .sort((left, right) => new Date(right.ordered_at || 0).getTime() - new Date(left.ordered_at || 0).getTime())
    .slice(0, limit);
}

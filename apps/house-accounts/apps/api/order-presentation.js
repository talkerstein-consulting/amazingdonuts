export function websiteTaxes(taxes) {
  // Catalog rules take precedence; never apply an explicit tax and automatic taxes together.
  if (taxes.length) return { pricing_options: { auto_apply_taxes: true, auto_apply_discounts: true } };
  return { taxes: [{ uid: 'website-hst', name: 'HST', percentage: '13', scope: 'ORDER' }], pricing_options: { auto_apply_taxes: false, auto_apply_discounts: true } };
}

const paymentRefundStatus = payments => {
  const paid = payments.reduce((sum, payment) => sum + Number(payment?.amount_money?.amount || 0), 0);
  const refunded = payments.reduce((sum, payment) => sum + Number(payment?.refunded_money?.amount || 0), 0);
  if (!refunded) return null;
  return paid > 0 && refunded >= paid ? 'Refunded' : 'Partially refunded';
};

export function customerOrder(row, liveOrder, livePayments = []) {
  const { raw_square, ...result } = row;
  const square = liveOrder || raw_square?.order || raw_square || {};
  const payments = livePayments.length ? livePayments : raw_square?.payment ? [raw_square.payment] : [];
  const fulfillment = square.fulfillments?.[0];
  const deliveryFee = Number(square.total_service_charge_money?.amount || 0);
  const tax = Number(square.total_tax_money?.amount ?? row.tax);
  const total = Number(square.total_money?.amount ?? row.total);
  const tip = Number(square.total_tip_money?.amount || 0);
  const discount = Number(square.total_discount_money?.amount || 0);
  const status = row.delivery?.status;
  const labels = { pending: 'Finding a courier', pickup: 'Courier dispatched', pickup_complete: 'Picked up', dropoff: 'Out for delivery', delivered: 'Delivered', canceled: 'Delivery cancelled', returned: 'Returned to bakery', dispatch_failed: 'Delivery dispatch failed' };
  const states = { PROPOSED: 'Order received', RESERVED: 'Preparing', PREPARED: row.fulfillment?.type === 'delivery' ? 'Ready for courier' : 'Ready for pickup', COMPLETED: row.fulfillment?.type === 'delivery' ? 'Delivered' : 'Collected', CANCELED: 'Cancelled', FAILED: 'Fulfillment failed' };
  const orderStates = { OPEN: 'Open', COMPLETED: 'Completed', CANCELED: 'Cancelled', DRAFT: 'Draft' };
  const refundStatus = paymentRefundStatus(payments);
  return { ...result, line_items: square.line_items || row.line_items || [], ordered_at: square.created_at || row.ordered_at, tax, total, breakdown: { merchandise: total - tax - deliveryFee - tip + discount, deliveryFee, discount, tip, tax, total },
    fulfillmentStatus: labels[status] || states[fulfillment?.state] || orderStates[square.state] || 'Order received',
    scheduledAt: row.fulfillment?.scheduledAt || fulfillment?.delivery_details?.deliver_at || fulfillment?.pickup_details?.pickup_at,
    statusUpdatedAt: liveOrder?.updated_at || square.updated_at || null,
    liveStatusAvailable: Boolean(liveOrder),
    paymentStatus: refundStatus || (row.status === 'refunded' ? 'Refunded' : row.payment_method === 'house_account' ? 'On account' : payments.some(payment => payment?.status === 'COMPLETED') || row.status === 'completed' ? 'Paid' : 'Payment processing') };
}

export function websiteTaxes(taxes) {
  // Catalog rules take precedence; never apply an explicit tax and automatic taxes together.
  if (taxes.length) return { pricing_options: { auto_apply_taxes: true, auto_apply_discounts: true } };
  return { taxes: [{ uid: 'website-hst', name: 'HST', percentage: '13', scope: 'ORDER' }], pricing_options: { auto_apply_taxes: false, auto_apply_discounts: true } };
}

export function customerOrder(row, liveOrder) {
  const { raw_square, ...result } = row;
  const square = liveOrder || raw_square?.order || raw_square || {};
  const fulfillment = square.fulfillments?.[0];
  const deliveryFee = Number(square.total_service_charge_money?.amount || 0);
  const tax = Number(square.total_tax_money?.amount ?? row.tax);
  const total = Number(square.total_money?.amount ?? row.total);
  const tip = Number(square.total_tip_money?.amount || 0);
  const discount = Number(square.total_discount_money?.amount || 0);
  const status = row.delivery?.status;
  const labels = { pending: 'Finding a courier', pickup: 'Courier dispatched', pickup_complete: 'Picked up', dropoff: 'Out for delivery', delivered: 'Delivered', canceled: 'Delivery cancelled', returned: 'Returned to bakery', dispatch_failed: 'Delivery dispatch failed' };
  const states = { PROPOSED: 'Order received', RESERVED: 'Preparing', PREPARED: row.fulfillment?.type === 'delivery' ? 'Ready for courier' : 'Ready for pickup', COMPLETED: row.fulfillment?.type === 'delivery' ? 'Delivered' : 'Collected', CANCELED: 'Cancelled', FAILED: 'Fulfillment failed' };
  return { ...result, tax, total, breakdown: { merchandise: total - tax - deliveryFee - tip + discount, deliveryFee, discount, tip, tax, total },
    fulfillmentStatus: labels[status] || states[fulfillment?.state] || 'Order received',
    scheduledAt: row.fulfillment?.scheduledAt || fulfillment?.delivery_details?.deliver_at || fulfillment?.pickup_details?.pickup_at,
    statusUpdatedAt: liveOrder?.updated_at || square.updated_at || null,
    liveStatusAvailable: Boolean(liveOrder),
    paymentStatus: row.payment_method === 'house_account' ? 'On account' : row.status === 'refunded' ? 'Refunded' : raw_square?.payment?.status === 'COMPLETED' || row.status === 'completed' ? 'Paid' : 'Payment processing' };
}

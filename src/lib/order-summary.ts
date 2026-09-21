type OrderSummary = {
  fulfillment?: { type?: string };
  payment_method?: string;
  paymentStatus?: string;
  scheduledAt?: string;
  source?: string;
};

const torontoDateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const orderFulfillmentSummary = (order: OrderSummary) => {
  const fulfillment = order.fulfillment?.type === "delivery" ? "Delivery" : "Pickup";
  if (!order.scheduledAt) return fulfillment;

  const scheduledAt = new Date(order.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return fulfillment;

  return `${fulfillment}: ${torontoDateTime.format(scheduledAt)}`;
};

export const orderPaymentSummary = (order: OrderSummary) => {
  const status = String(order.paymentStatus || "");

  if (/refund/i.test(status)) return "Refunded";
  if (/processing|pending/i.test(status)) return "Payment processing";
  if (order.payment_method === "house_account") return "Paid on account";
  if (order.source === "in_store" || order.payment_method === "cash") return "Paid In-Store";
  if (order.payment_method === "card") return "Paid via Credit Card";

  return status || "Payment received";
};

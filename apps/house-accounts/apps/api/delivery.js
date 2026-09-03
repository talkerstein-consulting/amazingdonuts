const DEFAULT_POSTAL_PREFIXES = ["M2R", "M3H", "M3K", "M3M", "M3N", "M4N", "M5M", "M6A"];

const cents = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const minutes = (value, fallback) => {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const total = Number(match[1]) * 60 + Number(match[2]);
  return total >= 0 && total <= 24 * 60 ? total : fallback;
};

const interval = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 120 ? parsed : fallback;
};

export function deliveryConfig(env = process.env) {
  return {
    enabled: env.ENABLE_DELIVERY !== "false",
    postalPrefixes: String(env.DELIVERY_POSTAL_PREFIXES || DEFAULT_POSTAL_PREFIXES.join(","))
      .split(",")
      .map((value) => value.replace(/\s/g, "").toUpperCase())
      .filter(Boolean),
    minimumAmount: cents(env.DELIVERY_MINIMUM_AMOUNT, 2500),
    feeAmount: cents(env.DELIVERY_FEE_AMOUNT, 500),
    freeThreshold: cents(env.DELIVERY_FREE_THRESHOLD, 10000),
    provider: "OWN_DRIVER",
    schedule: {
      intervalMinutes: interval(env.FULFILLMENT_INTERVAL_MINUTES, 30),
      deliveryStart: minutes(env.DELIVERY_WINDOW_START, 6 * 60 + 30),
      deliveryEnd: minutes(env.DELIVERY_WINDOW_END, 16 * 60 + 30),
    },
  };
}

export function validateDelivery(fulfillment, policy) {
  if (fulfillment.type !== "delivery") return;
  if (!policy.enabled) throw checkoutError("Delivery is not currently available.", "DELIVERY_DISABLED");
  if (!fulfillment.address) throw checkoutError("A delivery address is required.", "DELIVERY_ADDRESS_REQUIRED");
  const postalCode = fulfillment.address.postalCode.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postalCode)) {
    throw checkoutError("Enter a valid Canadian postal code.", "INVALID_POSTAL_CODE");
  }
  if (policy.postalPrefixes.length && !policy.postalPrefixes.some((prefix) => postalCode.startsWith(prefix))) {
    throw checkoutError("This address is outside our current Bathurst delivery area.", "OUTSIDE_DELIVERY_ZONE");
  }
}

export function validateFulfillmentSchedule(fulfillment, policy = deliveryConfig({}), now = new Date()) {
  const scheduled = new Date(fulfillment.scheduledAt);
  if (Number.isNaN(scheduled.getTime()) || scheduled <= now) {
    throw checkoutError("Choose a future fulfillment time.", "INVALID_FULFILLMENT_TIME");
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(scheduled).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const schedule = policy.schedule || deliveryConfig({}).schedule;
  const pickupWindows = { Sun: [8 * 60, 13 * 60], Mon: [7 * 60 + 30, 16 * 60], Tue: [7 * 60 + 30, 16 * 60], Wed: [7 * 60 + 30, 16 * 60], Thu: [7 * 60 + 30, 16 * 60], Fri: [7 * 60 + 30, 14 * 60] };
  const window = fulfillment.type === "delivery"
    ? (parts.weekday === "Sat" ? undefined : [schedule.deliveryStart, schedule.deliveryEnd])
    : pickupWindows[parts.weekday];
  const minutes = hour * 60 + minute;
  if (!window || minutes < window[0] || minutes + schedule.intervalMinutes > window[1]) {
    throw checkoutError("Choose a time during our published pickup and delivery hours.", "OUTSIDE_FULFILLMENT_HOURS");
  }
  if ((minutes - window[0]) % schedule.intervalMinutes !== 0) {
    throw checkoutError(`Choose a fulfillment time in a ${schedule.intervalMinutes}-minute interval.`, "INVALID_FULFILLMENT_INTERVAL");
  }
}

export function deliveryFee(subtotal, fulfillment, policy) {
  if (fulfillment.type !== "delivery" || subtotal >= policy.freeThreshold) return 0;
  if (subtotal < policy.minimumAmount) {
    throw checkoutError(
      `Delivery requires a minimum merchandise order of $${(policy.minimumAmount / 100).toFixed(2)}.`,
      "DELIVERY_MINIMUM",
    );
  }
  return policy.feeAmount;
}

export function merchandiseSubtotal(order) {
  if (order.subtotal_money?.amount != null) return Number(order.subtotal_money.amount);
  return (order.line_items || []).reduce(
    (total, line) => total + Number(line.total_money?.amount || 0),
    0,
  );
}

export function deliveryServiceCharge(amount) {
  if (!amount) return [];
  return [{
    uid: "website-delivery-fee",
    name: "Local delivery",
    amount_money: { amount, currency: "CAD" },
    calculation_phase: "SUBTOTAL_PHASE",
    taxable: true,
    scope: "ORDER",
  }];
}

function checkoutError(message, code) {
  return Object.assign(new Error(message), { status: 409, code });
}

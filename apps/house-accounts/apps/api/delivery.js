const DEFAULT_FEE_TIERS = {
  M3K: 1500, M6C: 1500, M3M: 1500, M6A: 1500, M6B: 1500, M5N: 1500, M5M: 1500, L4J: 1500,
  M6E: 2000, M4N: 2000, M4P: 2000, M4R: 2000, M3J: 2000, M2R: 2000, M2N: 2000, M2M: 2000, M2P: 2000,
  M5P: 2500, M4V: 2500, M5R: 2500, M3H: 2500,
  M4S: 4500, M4T: 4500, M4W: 4500, M4X: 4500, M6N: 4500, M6P: 4500, M6R: 4500, M6J: 4500,
  M6K: 4500, M5V: 4500, M5T: 4500, M5S: 4500, M7A: 4500, M5G: 4500, M5H: 4500, M5J: 4500,
  M5E: 4500, M4Y: 4500, M5A: 4500, M3C: 4500, M4A: 4500, M4B: 4500, M4C: 4500, M1L: 4500,
  M2J: 4500, M2H: 4500, L6A: 4500, L3T: 4500, L0J: 4500, L4C: 4500,
};

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
  const configuredTiers = String(env.DELIVERY_FEE_TIERS || "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const feeTiers = configuredTiers.length
    ? Object.fromEntries(configuredTiers.map((entry) => {
        const [prefix, amount] = entry.split(":");
        return [String(prefix || "").replace(/\s/g, "").toUpperCase(), cents(amount, -1)];
      }).filter(([prefix, amount]) => /^[A-Z]\d[A-Z]$/.test(prefix) && amount >= 0))
    : DEFAULT_FEE_TIERS;
  return {
    enabled: env.ENABLE_DELIVERY !== "false",
    postalPrefixes: Object.keys(feeTiers),
    feeTiers,
    minimumAmount: cents(env.DELIVERY_MINIMUM_AMOUNT, 2500),
    feeAmount: cents(env.DELIVERY_FEE_AMOUNT, 1500),
    freeThreshold: cents(env.DELIVERY_FREE_THRESHOLD, 20000) || 20000,
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
  if (fulfillment.asap && (scheduled.getTime() - now.getTime() < 10 * 60000 || scheduled.getTime() - now.getTime() > 30 * 60000)) {
    throw checkoutError("As soon as possible needs at least 10 minutes of preparation time.", "INVALID_ASAP_TIME");
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
  if (!window || minutes < window[0] || minutes + (fulfillment.asap ? 10 : schedule.intervalMinutes) > window[1]) {
    throw checkoutError("Choose a time during our published pickup and delivery hours.", "OUTSIDE_FULFILLMENT_HOURS");
  }
  if (!fulfillment.asap && (minutes - window[0]) % schedule.intervalMinutes !== 0) {
    throw checkoutError(`Choose a fulfillment time in a ${schedule.intervalMinutes}-minute interval.`, "INVALID_FULFILLMENT_INTERVAL");
  }
}

export function validateFridayOnlyItems(items, fulfillment) {
  if (!items.some(item => /\(\s*friday\s+only\s*\)/i.test(item.name))) return;
  const weekday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short",
  }).format(new Date(fulfillment.scheduledAt));
  if (weekday !== "Fri") {
    throw checkoutError("Friday-only items must be picked up or delivered on a Friday.", "FRIDAY_ONLY_FULFILLMENT");
  }
}

export function deliveryFee(subtotal, fulfillment, policy) {
  if (fulfillment.type !== "delivery" || (policy.freeThreshold > 0 && subtotal >= policy.freeThreshold)) return 0;
  if (subtotal < policy.minimumAmount) {
    throw checkoutError(
      `Delivery requires a minimum merchandise order of $${(policy.minimumAmount / 100).toFixed(2)}.`,
      "DELIVERY_MINIMUM",
    );
  }
  const prefix = String(fulfillment.address?.postalCode || "").replace(/\s/g, "").toUpperCase().slice(0, 3);
  return policy.feeTiers?.[prefix] ?? policy.feeAmount;
}

export function merchandiseSubtotal(order) {
  if (order.subtotal_money?.amount != null) return Number(order.subtotal_money.amount);
  return (order.line_items || []).reduce(
    (total, line) => total + Number(line.total_money?.amount || 0),
    0,
  );
}

export function deliveryServiceCharge(amount, catalogObjects = [], locationId) {
  if (!amount) return [];
  const match = catalogObjects.find(object => object.type === "SERVICE_CHARGE" && !object.is_deleted &&
    !object.absent_at_location_ids?.includes(locationId) &&
    (object.present_at_all_locations !== false || object.present_at_location_ids?.includes(locationId)) &&
    /^Delivery\s*[–-]\s*\$\d+/i.test(object.service_charge_data?.name || "") &&
    Number(object.service_charge_data?.amount_money?.amount) === amount &&
    object.service_charge_data?.amount_money?.currency === "CAD" &&
    object.service_charge_data?.taxable === true);
  if (!match) throw checkoutError(`Delivery pricing is temporarily unavailable for this postal code. Please contact the bakery.`, "DELIVERY_CHARGE_UNAVAILABLE");
  return [{
    uid: "website-delivery-fee",
    catalog_object_id: match.id,
    calculation_phase: "SUBTOTAL_PHASE",
    taxable: true,
    scope: "ORDER",
  }];
}

function checkoutError(message, code) {
  return Object.assign(new Error(message), { status: 409, code });
}

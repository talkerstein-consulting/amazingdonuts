import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { getPublicCatalog } from "./catalog.js";
import { findOrCreateSquareCustomer } from "./customers.js";

const addressSchema = z.object({
  addressLine1: z.string().min(1).max(500),
  addressLine2: z.string().max(500).optional(),
  locality: z.string().min(1).max(255),
  administrativeDistrictLevel1: z.string().min(1).max(3),
  postalCode: z.string().min(3).max(32),
  country: z.string().length(2).default("CA")
});

export const checkoutSchema = z.object({
  idempotencyKey: z.string().uuid(),
  redirectUrl: z.string().url().optional(),
  locationId: z.string().min(1),
  customer: z.object({
    firstName: z.string().min(1).max(255),
    lastName: z.string().min(1).max(255),
    email: z.string().email(),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Use an E.164 phone number, such as +14165550100.")
  }),
  lineItems: z
    .array(
      z.object({
        catalogObjectId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(99),
        modifiers: z
          .array(z.object({ catalogObjectId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(99).default(1) }))
          .max(30)
          .default([]),
        note: z.string().max(500).optional()
      })
    )
    .min(1)
    .max(100),
  fulfillment: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("PICKUP"),
      scheduledAt: z.string().datetime({ offset: true }),
      note: z.string().max(500).optional()
    }),
    z.object({
      type: z.literal("DELIVERY"),
      scheduledAt: z.string().datetime({ offset: true }),
      address: addressSchema,
      note: z.string().max(500).optional()
    })
  ])
});

export const paymentSchema = checkoutSchema.omit({ redirectUrl: true }).extend({
  sourceId: z.string().min(1).max(255),
  verificationToken: z.string().min(1).max(2048).optional(),
  tipAmount: z.coerce.number().int().min(0).max(100_000).default(0),
  saveCard: z.boolean().default(false)
});

const toSquareAddress = (address) => ({
  address_line_1: address.addressLine1,
  ...(address.addressLine2 ? { address_line_2: address.addressLine2 } : {}),
  locality: address.locality,
  administrative_district_level_1: address.administrativeDistrictLevel1,
  postal_code: address.postalCode,
  country: address.country
});

const dayNames = { Sun: "SUN", Mon: "MON", Tue: "TUE", Wed: "WED", Thu: "THU", Fri: "FRI", Sat: "SAT" };
const fallbackBusinessPeriods = [
  { day_of_week: "SUN", start_local_time: "08:00:00", end_local_time: "13:00:00" },
  ...["MON", "TUE", "WED", "THU"].map((day_of_week) => ({ day_of_week, start_local_time: "07:30:00", end_local_time: "16:00:00" })),
  { day_of_week: "FRI", start_local_time: "07:30:00", end_local_time: "13:00:00" }
];

function localScheduleParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { day: dayNames[values.weekday], time: `${values.hour}:${values.minute}:${values.second}` };
}

function insideBusinessHours(date, location) {
  const periods = location.business_hours?.periods?.length
    ? location.business_hours.periods
    : fallbackBusinessPeriods;
  const timezone = /default test account/i.test(location.name || "")
    ? "America/Toronto"
    : location.timezone || "America/Toronto";
  const local = localScheduleParts(date, timezone);
  return periods.some(
    (period) =>
      period.day_of_week === local.day &&
      period.start_local_time <= local.time &&
      local.time < period.end_local_time
  );
}

async function validateSchedule(square, input, config) {
  const scheduledAt = new Date(input.fulfillment.scheduledAt);
  const now = Date.now();
  const earliest = now + config.MIN_ORDER_LEAD_MINUTES * 60_000;
  const latest = now + config.MAX_ORDER_ADVANCE_DAYS * 86_400_000;
  if (scheduledAt.getTime() < earliest) {
    throw new AppError(409, "INSUFFICIENT_LEAD_TIME", "The selected time is too soon.");
  }
  if (scheduledAt.getTime() > latest) {
    throw new AppError(409, "ORDER_TOO_FAR_AHEAD", "The selected time is too far in advance.");
  }

  const result = await square.listLocations();
  const location = result.locations?.find(
    (candidate) => candidate.id === input.locationId && candidate.status === "ACTIVE"
  );
  if (!location) throw new AppError(400, "INVALID_LOCATION", "Square location is not active.");
  if (!insideBusinessHours(scheduledAt, location)) {
    throw new AppError(409, "OUTSIDE_BUSINESS_HOURS", "The selected time is outside store hours.");
  }
}

function fulfillmentFor(input, config) {
  const recipient = {
    display_name: `${input.customer.firstName} ${input.customer.lastName}`,
    email_address: input.customer.email,
    phone_number: input.customer.phone
  };

  if (input.fulfillment.type === "PICKUP") {
    return {
      type: "PICKUP",
      state: "PROPOSED",
      pickup_details: {
        recipient,
        schedule_type: "SCHEDULED",
        pickup_at: input.fulfillment.scheduledAt,
        prep_time_duration: `PT${config.PREP_TIME_MINUTES}M`,
        ...(input.fulfillment.note ? { note: input.fulfillment.note } : {})
      }
    };
  }

  return {
    type: "DELIVERY",
    state: "PROPOSED",
    delivery_details: {
      recipient: { ...recipient, address: toSquareAddress(input.fulfillment.address) },
      schedule_type: "SCHEDULED",
      deliver_at: input.fulfillment.scheduledAt,
      prep_time_duration: `PT${config.PREP_TIME_MINUTES}M`,
      ...(input.fulfillment.note ? { note: input.fulfillment.note } : {})
    }
  };
}

export function buildSquareOrder(input, config, customerId) {
  const idempotencyKey = input.idempotencyKey || randomUUID();
  return {
    location_id: input.locationId,
    reference_id: `web-${idempotencyKey}`.slice(0, 40),
    ...(customerId ? { customer_id: customerId } : {}),
    source: { name: "Amazing Donuts Website" },
    line_items: input.lineItems.map((item) => ({
      catalog_object_id: item.catalogObjectId,
      quantity: String(item.quantity),
      modifiers: item.modifiers.map((modifier) => ({
        catalog_object_id: modifier.catalogObjectId,
        quantity: String(modifier.quantity)
      })),
      ...(item.note ? { note: item.note } : {})
    })),
    ...(input.fulfillment.type === "DELIVERY" && config.DELIVERY_FEE_AMOUNT
      ? { service_charges: [{
          name: "Local delivery",
          amount_money: { amount: config.DELIVERY_FEE_AMOUNT, currency: "CAD" },
          calculation_phase: "TOTAL_PHASE",
          taxable: true,
          scope: "ORDER"
        }] }
      : {}),
    fulfillments: [fulfillmentFor(input, config)],
    pricing_options: { auto_apply_taxes: true, auto_apply_discounts: true }
  };
}

export function buildPaymentLinkRequest(input, config, customerId) {
  const idempotencyKey = input.idempotencyKey || randomUUID();
  const order = buildSquareOrder(input, config, customerId);

  return {
    idempotency_key: idempotencyKey,
    order,
    checkout_options: {
      allow_tipping: config.ALLOW_TIPPING,
      redirect_url: input.redirectUrl || config.CHECKOUT_REDIRECT_URL,
      ...(config.MERCHANT_SUPPORT_EMAIL
        ? { merchant_support_email: config.MERCHANT_SUPPORT_EMAIL }
        : {})
    },
    pre_populated_data: {
      buyer_email: input.customer.email,
      buyer_phone_number: input.customer.phone,
      ...(input.fulfillment.type === "DELIVERY"
        ? { buyer_address: toSquareAddress(input.fulfillment.address) }
        : {})
    },
    payment_note: "Amazing Donuts website order"
  };
}

function validateCheckoutCapabilities(input, config) {
  if (config.SQUARE_LOCATION_ID && input.locationId !== config.SQUARE_LOCATION_ID) {
    throw new AppError(400, "INVALID_LOCATION", "This location is not enabled for online checkout.");
  }
  if (input.fulfillment.type === "DELIVERY" && !config.ENABLE_DELIVERY) {
    throw new AppError(
      409,
      "DELIVERY_NOT_ENABLED",
      "Delivery checkout is disabled until the Square delivery workflow is verified."
    );
  }
  if (input.fulfillment.type === "DELIVERY" && config.DELIVERY_POSTAL_PREFIXES.length) {
    const normalized = input.fulfillment.address.postalCode.replace(/\s/g, "").toUpperCase();
    if (!config.DELIVERY_POSTAL_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      throw new AppError(409, "OUTSIDE_DELIVERY_ZONE", "This address is outside the current delivery area.");
    }
  }
}

const invalidCart = (message) => {
  throw new AppError(400, "INVALID_CART", message);
};

export function validateCatalogSelection(input, catalog) {
  const variationMap = new Map();
  for (const product of catalog.products || []) {
    for (const variation of product.variations || []) variationMap.set(variation.id, { product, variation });
  }
  const modifierMap = new Map();
  for (const list of catalog.modifierLists || []) {
    for (const modifier of list.modifiers || []) modifierMap.set(modifier.id, { list, modifier });
  }

  const quantities = new Map();
  for (const item of input.lineItems) {
    const record = variationMap.get(item.catalogObjectId);
    if (!record) invalidCart("An item is unavailable or hidden from online ordering.");
    if (record.variation.soldOut) invalidCart(`${record.product.name} is sold out.`);
    quantities.set(item.catalogObjectId, (quantities.get(item.catalogObjectId) || 0) + item.quantity);

    const allowedLists = new Map(
      record.product.modifierListIds
        .filter((info) => info.enabled)
        .map((info) => [info.id, info])
    );
    const selections = new Map();
    const selectedNames = new Map();
    const seenModifiers = new Set();
    for (const selection of item.modifiers) {
      if (seenModifiers.has(selection.catalogObjectId)) invalidCart("A modifier was selected more than once.");
      seenModifiers.add(selection.catalogObjectId);
      const modifier = modifierMap.get(selection.catalogObjectId);
      if (!modifier || !allowedLists.has(modifier.list.id)) {
        invalidCart(`A modifier is not available for ${record.product.name}.`);
      }
      if (modifier.list.selectionType === "SINGLE" && selection.quantity !== 1) {
        invalidCart(`${modifier.list.name} accepts one selection.`);
      }
      selections.set(modifier.list.id, (selections.get(modifier.list.id) || 0) + selection.quantity);
      selectedNames.set(modifier.list.name, modifier.modifier.name);
    }
    for (const [listId, info] of allowedLists) {
      const count = selections.get(listId) || 0;
      if (info.minSelected !== null && count < info.minSelected) invalidCart("Required product options are missing.");
      if (info.maxSelected !== null && count > info.maxSelected) invalidCart("Too many product options were selected.");
    }

    if (record.variation.sku === "DSPCL-SPR") {
      const required = ["Builder: Shape", "Builder: Icing", "Builder: Filling", "Builder: Topping"];
      if (required.some((name) => !selectedNames.has(name))) invalidCart("Every custom donut layer must be selected.");
      const shape = selectedNames.get("Builder: Shape");
      const icing = selectedNames.get("Builder: Icing");
      const filling = selectedNames.get("Builder: Filling");
      const topping = selectedNames.get("Builder: Topping");
      if (!["Sofgania / Boston", "Kids Size Sofgania"].includes(shape) && filling !== "No Filling") {
        invalidCart(`${shape} cannot be filled.`);
      }
      if (icing === "No Icing" && topping !== "No Sprinkles") invalidCart("Toppings require icing.");
      if (["Twist", "Mini Cupcakes", '2" Cookie'].includes(shape) && topping === "Gold Flakes") {
        invalidCart(`Gold Flakes are not available on ${shape}.`);
      }
    }
  }

  for (const [variationId, quantity] of quantities) {
    const variation = variationMap.get(variationId).variation;
    if (variation.trackInventory && variation.quantityAvailable !== null && quantity > variation.quantityAvailable) {
      invalidCart("The requested quantity is no longer available.");
    }
  }
}

async function validateCheckoutCart(square, input, catalogLoader) {
  const catalog = await catalogLoader(square, input.locationId);
  validateCatalogSelection(input, catalog);
}

async function prepareCustomer({ square, input, customerId }) {
  if (customerId) return { id: customerId };
  return findOrCreateSquareCustomer(square, {
    ...input.customer,
    idempotencyKey: `customer-${input.idempotencyKey || randomUUID()}`,
    ...(input.fulfillment.type === "DELIVERY"
      ? { address: toSquareAddress(input.fulfillment.address) }
      : {})
  });
}

export async function createRetailCheckout({ square, config, body, catalogLoader = getPublicCatalog }) {
  const input = checkoutSchema.parse(body);
  if (input.redirectUrl) {
    const allowedHosts = new Set([
      new URL(config.APP_ORIGIN).host,
      new URL(config.CHECKOUT_REDIRECT_URL).host,
      "amazingdonuts.vercel.app",
      "amazingdonuts.com",
      "www.amazingdonuts.com"
    ]);
    if (!allowedHosts.has(new URL(input.redirectUrl).host)) {
      throw new AppError(400, "INVALID_REDIRECT", "Checkout redirect URL is not allowed.");
    }
  }
  validateCheckoutCapabilities(input, config);
  await validateCheckoutCart(square, input, catalogLoader);

  await validateSchedule(square, input, config);

  const customer = await prepareCustomer({ square, input });
  const request = buildPaymentLinkRequest(input, config, customer.id);
  const result = await square.createPaymentLink(request);

  return {
    orderId: result.payment_link?.order_id,
    paymentLinkId: result.payment_link?.id,
    checkoutUrl: result.payment_link?.url,
    customerId: customer.id
  };
}

export async function createRetailPayment({ square, config, body, catalogLoader = getPublicCatalog, customerId }) {
  const input = paymentSchema.parse(body);
  validateCheckoutCapabilities(input, config);
  await validateCheckoutCart(square, input, catalogLoader);
  await validateSchedule(square, input, config);

  const customer = await prepareCustomer({ square, input, customerId });
  const orderResult = await square.createOrder({
    idempotency_key: `order-${input.idempotencyKey}`,
    order: buildSquareOrder(input, config, customer.id)
  });
  const order = orderResult.order;
  if (!order?.id || !order.total_money?.amount || !order.total_money.currency) {
    throw new AppError(502, "INVALID_SQUARE_ORDER", "Square did not return a payable order total.");
  }
  if (input.fulfillment.type === "DELIVERY") {
    const merchandise = Number(order.subtotal_money?.amount || 0);
    if (merchandise < config.DELIVERY_MINIMUM_AMOUNT) {
      throw new AppError(409, "DELIVERY_MINIMUM", `Delivery requires a minimum merchandise order of $${(config.DELIVERY_MINIMUM_AMOUNT / 100).toFixed(2)}.`);
    }
  }

  const paymentResult = await square.createPayment({
    idempotency_key: `payment-${input.idempotencyKey}`,
    source_id: input.sourceId,
    amount_money: order.total_money,
    ...(input.tipAmount ? { tip_money: { amount: input.tipAmount, currency: order.total_money.currency } } : {}),
    order_id: order.id,
    location_id: input.locationId,
    customer_id: customer.id,
    autocomplete: true,
    reference_id: order.reference_id,
    note: "Amazing Donuts website order",
    ...(input.verificationToken ? { verification_token: input.verificationToken } : {})
  });

  let savedCard = null;
  if (input.saveCard && paymentResult.payment?.id) {
    const cardResult = await square.createCard({
      idempotency_key: `card-${input.idempotencyKey}`,
      source_id: paymentResult.payment.id,
      card: {
        customer_id: customer.id,
        cardholder_name: `${input.customer.firstName} ${input.customer.lastName}`,
        reference_id: `retail-${customer.id}`.slice(0, 40)
      }
    });
    savedCard = cardResult.card || null;
  }

  return {
    orderId: order.id,
    paymentId: paymentResult.payment?.id,
    paymentStatus: paymentResult.payment?.status,
    customerId: customer.id,
    totalMoney: paymentResult.payment?.total_money || {
      amount: Number(order.total_money.amount) + input.tipAmount,
      currency: order.total_money.currency
    },
    tipMoney: paymentResult.payment?.tip_money || { amount: input.tipAmount, currency: order.total_money.currency },
    savedCard: savedCard ? { id: savedCard.id, brand: savedCard.card_brand, last4: savedCard.last_4 } : null,
    receiptUrl: paymentResult.payment?.receipt_url || null
  };
}

export async function createRetailQuote({ square, config, body, catalogLoader = getPublicCatalog }) {
  const input = checkoutSchema.omit({ redirectUrl: true }).parse(body);
  validateCheckoutCapabilities(input, config);
  await validateCheckoutCart(square, input, catalogLoader);
  await validateSchedule(square, input, config);
  const result = await square.calculateOrder({ order: buildSquareOrder(input, config, null) });
  const order = result.order;
  if (!order?.total_money) throw new AppError(502, "INVALID_SQUARE_QUOTE", "Square could not calculate this order.");
  if (input.fulfillment.type === "DELIVERY" && Number(order.subtotal_money?.amount || 0) < config.DELIVERY_MINIMUM_AMOUNT) {
    throw new AppError(409, "DELIVERY_MINIMUM", `Delivery requires a minimum merchandise order of $${(config.DELIVERY_MINIMUM_AMOUNT / 100).toFixed(2)}.`);
  }
  return {
    subtotalMoney: order.subtotal_money,
    taxMoney: order.total_tax_money,
    serviceChargeMoney: order.total_service_charge_money,
    discountMoney: order.total_discount_money,
    totalMoney: order.total_money
  };
}

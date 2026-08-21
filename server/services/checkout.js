import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
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
  verificationToken: z.string().min(1).max(2048).optional()
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
  const periods = location.business_hours?.periods || [];
  if (!periods.length) return true;
  const local = localScheduleParts(date, location.timezone || "America/Toronto");
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
    customer_id: customerId,
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
}

async function prepareCustomer({ square, input }) {
  return findOrCreateSquareCustomer(square, {
    ...input.customer,
    idempotencyKey: `customer-${input.idempotencyKey || randomUUID()}`,
    ...(input.fulfillment.type === "DELIVERY"
      ? { address: toSquareAddress(input.fulfillment.address) }
      : {})
  });
}

export async function createRetailCheckout({ square, config, body }) {
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

export async function createRetailPayment({ square, config, body }) {
  const input = paymentSchema.parse(body);
  validateCheckoutCapabilities(input, config);
  await validateSchedule(square, input, config);

  const customer = await prepareCustomer({ square, input });
  const orderResult = await square.createOrder({
    idempotency_key: `order-${input.idempotencyKey}`,
    order: buildSquareOrder(input, config, customer.id)
  });
  const order = orderResult.order;
  if (!order?.id || !order.total_money?.amount || !order.total_money.currency) {
    throw new AppError(502, "INVALID_SQUARE_ORDER", "Square did not return a payable order total.");
  }

  const paymentResult = await square.createPayment({
    idempotency_key: `payment-${input.idempotencyKey}`,
    source_id: input.sourceId,
    amount_money: order.total_money,
    order_id: order.id,
    location_id: input.locationId,
    customer_id: customer.id,
    autocomplete: true,
    reference_id: order.reference_id,
    note: "Amazing Donuts website order",
    ...(input.verificationToken ? { verification_token: input.verificationToken } : {})
  });

  return {
    orderId: order.id,
    paymentId: paymentResult.payment?.id,
    paymentStatus: paymentResult.payment?.status,
    customerId: customer.id,
    totalMoney: order.total_money,
    receiptUrl: paymentResult.payment?.receipt_url || null
  };
}

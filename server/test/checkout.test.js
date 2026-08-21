import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPaymentLinkRequest,
  buildSquareOrder,
  checkoutSchema,
  createRetailPayment,
  validateCatalogSelection
} from "../services/checkout.js";

const pickup = {
  idempotencyKey: "c77d5d09-d7ee-47a4-88c5-fb1992be8cf6",
  redirectUrl: "https://amazingdonuts.vercel.app/order-confirmation",
  locationId: "LOC_1",
  customer: {
    firstName: "Test",
    lastName: "Customer",
    email: "test@example.com",
    phone: "+14165550100"
  },
  lineItems: [
    {
      catalogObjectId: "VAR_FILLED",
      quantity: 2,
      modifiers: [{ catalogObjectId: "MOD_CHOCOLATE", quantity: 1 }]
    }
  ],
  fulfillment: { type: "PICKUP", scheduledAt: "2026-08-22T14:00:00-04:00" }
};

const normalizedCatalog = {
  products: [{
    name: "Filled Donut",
    modifierListIds: [{ id: "LIST_1", minSelected: 0, maxSelected: 1, enabled: true }],
    variations: [{ id: "VAR_FILLED", sku: "FILLED", soldOut: false, trackInventory: true, quantityAvailable: 4 }]
  }],
  modifierLists: [{
    id: "LIST_1",
    name: "Icing",
    selectionType: "SINGLE",
    modifiers: [{ id: "MOD_CHOCOLATE", name: "Chocolate" }]
  }]
};

test("builds a hosted checkout order from catalog IDs, not browser prices", () => {
  const input = checkoutSchema.parse(pickup);
  const request = buildPaymentLinkRequest(
    input,
    {
      ALLOW_TIPPING: true,
      CHECKOUT_REDIRECT_URL: "https://amazingdonuts.com/order-confirmation",
      MERCHANT_SUPPORT_EMAIL: "orders@amazingdonuts.com",
      PREP_TIME_MINUTES: 30
    },
    "CUSTOMER_1"
  );

  assert.equal(request.order.customer_id, "CUSTOMER_1");
  assert.equal(request.order.line_items[0].catalog_object_id, "VAR_FILLED");
  assert.equal(request.order.line_items[0].base_price_money, undefined);
  assert.equal(request.order.fulfillments[0].pickup_details.schedule_type, "SCHEDULED");
  assert.equal(request.order.fulfillments[0].pickup_details.prep_time_duration, "PT30M");
  assert.equal(request.checkout_options.allow_tipping, true);
  assert.equal(request.checkout_options.redirect_url, pickup.redirectUrl);
});

test("requires phone and a valid Square catalog variation", () => {
  const result = checkoutSchema.safeParse({
    ...pickup,
    customer: { ...pickup.customer, phone: "" },
    lineItems: [{ catalogObjectId: "", quantity: 1 }]
  });
  assert.equal(result.success, false);
});

test("rejects hidden items, unrelated modifiers, and unavailable quantities", () => {
  const input = checkoutSchema.parse(pickup);
  assert.throws(() => validateCatalogSelection({ ...input, lineItems: [{ catalogObjectId: "HIDDEN", quantity: 1, modifiers: [] }] }, normalizedCatalog), /unavailable or hidden/);
  assert.throws(() => validateCatalogSelection({ ...input, lineItems: [{ catalogObjectId: "VAR_FILLED", quantity: 1, modifiers: [{ catalogObjectId: "OTHER", quantity: 1 }] }] }, normalizedCatalog), /not available/);
  assert.throws(() => validateCatalogSelection({ ...input, lineItems: [{ catalogObjectId: "VAR_FILLED", quantity: 5, modifiers: [] }] }, normalizedCatalog), /no longer available/);
});

test("validates Square-first builder variations and compatibility", () => {
  const catalog = {
    products: [{
      name: "Customizable Donut",
      modifierListIds: ["Icing", "Filling", "Topping"].map((id) => ({ id, minSelected: 1, maxSelected: 1, enabled: true })),
      variations: [
        { id: "ROUND", name: "Round Donut", sku: "DSPCL-SPR", soldOut: false },
        { id: "FILLED", name: "Sofgania / Boston", sku: "AD-BUILD-SOFGANIA", soldOut: false }
      ]
    }],
    modifierLists: [
      { id: "Icing", name: "Builder: Icing", selectionType: "SINGLE", modifiers: [{ id: "PINK", name: "Vanilla · Pink" }, { id: "BARE", name: "No Icing" }] },
      { id: "Filling", name: "Builder: Filling", selectionType: "SINGLE", modifiers: [{ id: "NONE", name: "No Filling" }, { id: "CUSTARD", name: "Custard" }] },
      { id: "Topping", name: "Builder: Topping", selectionType: "SINGLE", modifiers: [{ id: "RAINBOW", name: "Rainbow" }, { id: "NO_TOP", name: "No Sprinkles" }] }
    ]
  };
  const input = checkoutSchema.parse({ ...pickup, lineItems: [{ catalogObjectId: "ROUND", quantity: 1, modifiers: [
    { catalogObjectId: "PINK", quantity: 1 }, { catalogObjectId: "NONE", quantity: 1 }, { catalogObjectId: "RAINBOW", quantity: 1 }
  ] }] });
  assert.doesNotThrow(() => validateCatalogSelection(input, catalog));
  assert.throws(() => validateCatalogSelection({ ...input, lineItems: [{ ...input.lineItems[0], catalogObjectId: "FILLED" }] }, catalog), /requires a filling/);
  assert.throws(() => validateCatalogSelection({ ...input, lineItems: [{ ...input.lineItems[0], modifiers: [
    { catalogObjectId: "BARE", quantity: 1 }, { catalogObjectId: "NONE", quantity: 1 }, { catalogObjectId: "RAINBOW", quantity: 1 }
  ] }] }, catalog), /Toppings require icing/);
});

test("builds the same Square order for embedded and hosted checkout", () => {
  const input = checkoutSchema.parse(pickup);
  const config = { PREP_TIME_MINUTES: 30 };
  assert.deepEqual(
    buildPaymentLinkRequest(input, { ...config, ALLOW_TIPPING: true, CHECKOUT_REDIRECT_URL: pickup.redirectUrl }, "CUSTOMER_1").order,
    buildSquareOrder(input, config, "CUSTOMER_1")
  );
});

test("creates and pays a Square order using the Square-calculated total", async () => {
  const calls = [];
  const scheduledAt = new Date(Date.now() + 86_400_000);
  const scheduledDay = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][scheduledAt.getUTCDay()];
  const square = {
    listLocations: async () => ({ locations: [{
      id: "LOC_1",
      status: "ACTIVE",
      timezone: "UTC",
      business_hours: { periods: [{ day_of_week: scheduledDay, start_local_time: "00:00:00", end_local_time: "23:59:59" }] }
    }] }),
    searchCustomers: async () => ({ customers: [{ id: "CUSTOMER_1" }] }),
    createOrder: async (body) => {
      calls.push(["order", body]);
      return {
        order: {
          ...body.order,
          id: "ORDER_1",
          total_money: { amount: 675, currency: "CAD" }
        }
      };
    },
    createPayment: async (body) => {
      calls.push(["payment", body]);
      return { payment: { id: "PAYMENT_1", status: "COMPLETED", receipt_url: "https://square.test/r/1" } };
    }
  };
  const result = await createRetailPayment({
    square,
    config: {
      SQUARE_LOCATION_ID: "LOC_1",
      ENABLE_DELIVERY: false,
      MIN_ORDER_LEAD_MINUTES: 0,
      MAX_ORDER_ADVANCE_DAYS: 365,
      PREP_TIME_MINUTES: 30
    },
    catalogLoader: async () => normalizedCatalog,
    body: {
      ...pickup,
      redirectUrl: undefined,
      fulfillment: { type: "PICKUP", scheduledAt: scheduledAt.toISOString() },
      sourceId: "cnon:card-nonce-ok",
      tipAmount: 100
    }
  });

  assert.equal(calls[1][1].amount_money.amount, 675);
  assert.equal(calls[1][1].tip_money.amount, 100);
  assert.equal(calls[1][1].order_id, "ORDER_1");
  assert.equal(result.paymentStatus, "COMPLETED");
});

test("adds a configurable own-driver delivery fee to the Square order", () => {
  const input = checkoutSchema.parse({
    ...pickup,
    fulfillment: {
      type: "DELIVERY",
      scheduledAt: "2026-08-24T14:00:00-04:00",
      address: {
        addressLine1: "3499 Bathurst Street",
        locality: "Toronto",
        administrativeDistrictLevel1: "ON",
        postalCode: "M6A 2C5",
        country: "CA"
      }
    }
  });
  const order = buildSquareOrder(input, { PREP_TIME_MINUTES: 30, DELIVERY_FEE_AMOUNT: 800 }, "CUSTOMER_1");
  assert.equal(order.fulfillments[0].type, "DELIVERY");
  assert.equal(order.service_charges[0].name, "Local delivery");
  assert.equal(order.service_charges[0].amount_money.amount, 800);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPaymentLinkRequest,
  buildSquareOrder,
  checkoutSchema,
  createRetailPayment
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
  const square = {
    listLocations: async () => ({ locations: [{ id: "LOC_1", status: "ACTIVE" }] }),
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
    body: {
      ...pickup,
      redirectUrl: undefined,
      fulfillment: { type: "PICKUP", scheduledAt: new Date(Date.now() + 86_400_000).toISOString() },
      sourceId: "cnon:card-nonce-ok"
    }
  });

  assert.equal(calls[1][1].amount_money.amount, 675);
  assert.equal(calls[1][1].order_id, "ORDER_1");
  assert.equal(result.paymentStatus, "COMPLETED");
});

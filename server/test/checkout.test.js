import assert from "node:assert/strict";
import test from "node:test";
import { buildPaymentLinkRequest, checkoutSchema } from "../services/checkout.js";

const pickup = {
  idempotencyKey: "c77d5d09-d7ee-47a4-88c5-fb1992be8cf6",
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
});

test("requires phone and a valid Square catalog variation", () => {
  const result = checkoutSchema.safeParse({
    ...pickup,
    customer: { ...pickup.customer, phone: "" },
    lineItems: [{ catalogObjectId: "", quantity: 1 }]
  });
  assert.equal(result.success, false);
});

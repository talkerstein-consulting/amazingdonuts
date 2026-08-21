import { Router } from "express";
import { createRetailCheckout, createRetailPayment, createRetailQuote } from "../services/checkout.js";

export function checkoutRouter({ square, config, pool }) {
  const router = Router();

  router.get("/checkout/config", (_request, response) => {
    response.json({
      applicationId: config.SQUARE_APPLICATION_ID || null,
      locationId: config.SQUARE_LOCATION_ID || null,
      environment: config.SQUARE_ENVIRONMENT,
      deliveryEnabled: config.ENABLE_DELIVERY,
      houseAccountsEnabled: config.ENABLE_HOUSE_ACCOUNTS,
      tippingEnabled: config.ALLOW_TIPPING,
      deliveryMinimumMoney: { amount: config.DELIVERY_MINIMUM_AMOUNT, currency: "CAD" },
      deliveryFeeMoney: { amount: config.DELIVERY_FEE_AMOUNT, currency: "CAD" }
    });
  });

  router.post("/checkout/payment-link", async (request, response, next) => {
    try {
      const checkout = await createRetailCheckout({ square, config, body: request.body });
      response.status(201).json(checkout);
    } catch (error) {
      next(error);
    }
  });

  router.post("/checkout/quote", async (request, response, next) => {
    try {
      const quote = await createRetailQuote({ square, config, body: request.body });
      response.json(quote);
    } catch (error) { next(error); }
  });

  router.post("/checkout/payment", async (request, response, next) => {
    try {
      if (request.body?.saveCard && !request.user) {
        return response.status(401).json({ error: { code: "AUTH_REQUIRED", message: "Sign in to save a card." } });
      }
      const accountCustomer = request.user ? {
        firstName: request.user.first_name,
        lastName: request.user.last_name,
        email: request.user.email,
        phone: request.user.phone
      } : null;
      const payment = await createRetailPayment({
        square,
        config,
        body: accountCustomer ? { ...request.body, customer: accountCustomer } : request.body,
        customerId: request.user?.square_customer_id || undefined
      });
      if (request.user && !request.user.square_customer_id && payment.customerId) {
        await pool.query(
          "UPDATE retail_users SET square_customer_id=$2,updated_at=now() WHERE id=$1",
          [request.user.id, payment.customerId]
        );
      }
      response.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

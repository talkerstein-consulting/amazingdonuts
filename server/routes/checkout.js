import { Router } from "express";
import { createRetailCheckout, createRetailPayment } from "../services/checkout.js";

export function checkoutRouter({ square, config }) {
  const router = Router();

  router.get("/checkout/config", (_request, response) => {
    response.json({
      applicationId: config.SQUARE_APPLICATION_ID || null,
      locationId: config.SQUARE_LOCATION_ID || null,
      environment: config.SQUARE_ENVIRONMENT,
      deliveryEnabled: config.ENABLE_DELIVERY
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

  router.post("/checkout/payment", async (request, response, next) => {
    try {
      const payment = await createRetailPayment({ square, config, body: request.body });
      response.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

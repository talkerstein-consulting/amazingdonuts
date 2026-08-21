import { Router } from "express";
import { createRetailCheckout } from "../services/checkout.js";

export function checkoutRouter({ square, config }) {
  const router = Router();

  router.post("/checkout/payment-link", async (request, response, next) => {
    try {
      const checkout = await createRetailCheckout({ square, config, body: request.body });
      response.status(201).json(checkout);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

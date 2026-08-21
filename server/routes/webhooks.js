import { Router } from "express";
import { AppError } from "../lib/errors.js";
import { persistWebhook } from "../db/webhooks.js";
import { verifySquareWebhook } from "../square/webhooks.js";

export function webhooksRouter({ config, pool }) {
  const router = Router();

  router.post("/square", async (request, response, next) => {
    try {
      const rawBody = request.body.toString("utf8");
      const signature = request.get("x-square-hmacsha256-signature");
      const valid = verifySquareWebhook({
        notificationUrl: config.SQUARE_WEBHOOK_NOTIFICATION_URL,
        signatureKey: config.SQUARE_WEBHOOK_SIGNATURE_KEY,
        body: rawBody,
        signature
      });
      if (!valid) throw new AppError(403, "INVALID_WEBHOOK_SIGNATURE", "Invalid Square signature.");

      const event = JSON.parse(rawBody);
      if (!event.event_id || !event.type) {
        throw new AppError(400, "INVALID_WEBHOOK_EVENT", "Square event ID and type are required.");
      }
      const result = await persistWebhook(pool, event);
      response.status(200).json({ received: true, duplicate: result.duplicate });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

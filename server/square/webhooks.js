import { createHmac, timingSafeEqual } from "node:crypto";

export function squareWebhookSignature({ notificationUrl, signatureKey, body }) {
  return createHmac("sha256", signatureKey)
    .update(notificationUrl + body)
    .digest("base64");
}

export function verifySquareWebhook({ notificationUrl, signatureKey, body, signature }) {
  if (!signature || typeof body !== "string") return false;

  const expected = Buffer.from(
    squareWebhookSignature({ notificationUrl, signatureKey, body }),
    "utf8"
  );
  const received = Buffer.from(signature, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

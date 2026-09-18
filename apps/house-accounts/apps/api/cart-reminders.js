import { createHmac, timingSafeEqual } from "node:crypto";

export function unsubscribeSignature(secret, tenantId, cartId, email) {
  return createHmac("sha256", secret).update(`${tenantId}:${cartId}:${email.toLowerCase()}`).digest("hex");
}

export function validUnsubscribeSignature(secret, cart, signature) {
  if (!/^[a-f0-9]{64}$/.test(String(signature))) return false;
  const expected = Buffer.from(unsubscribeSignature(secret, cart.tenant_id, cart.cart_id, cart.email), "hex");
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export function reminderText(cart, siteUrl, signature) {
  const lines = cart.items.map(item => `${item.name} x ${item.quantity}`).join("\n");
  const home = siteUrl.replace(/\/$/, "");
  const unsubscribe = `${home}/api/house/public/storefront/cart-reminders/unsubscribe?cartId=${encodeURIComponent(cart.cart_id)}&token=${signature}`;
  return `Your Amazing Donuts bag is waiting:\n\n${lines}\n\nReturn to your bag: ${home}/shop/\n\nPrices and availability are confirmed at checkout.\n\nAmazing Donuts, 3499 Bathurst Street, Toronto, Ontario.\nUnsubscribe from this reminder: ${unsubscribe}`;
}

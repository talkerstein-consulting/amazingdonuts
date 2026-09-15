/* Interface-only stand-in for the house-accounts API.

   The real API refuses to boot without Square credentials, which keeps every
   secret off this machine — and also keeps the checkout page stuck on "the
   checkout service is unavailable", which hides step 3 entirely. This serves
   just enough of /api/storefront/* for the page to render every state:
   a signed-in customer with a saved address and a card on file, a quote that
   totals the bag, and a config with delivery on. Nothing here talks to
   Square; `applicationId` is deliberately absent so the payment SDK is never
   loaded and no card form can be submitted.

   Run with `npm run dev:api:mock` (or the "api-mock" launch config), and the
   Vite proxy on /api/house points here exactly as it would to the real API.

   Toggle the signed-in state with ?guest=1 on the checkout URL — the session
   route reads the Referer, so /checkout/?guest=1 shows the guest lanes. */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

/* The quote is priced from the same static list the shop falls back to when
   Square's catalog is unreachable, so the bag and the quote agree. The file
   is TypeScript; a regex over `name:`/`price:` pairs is enough. */
const PRICES = new Map();
for (const [, name, price] of readFileSync("src/data/products.ts", "utf8")
  .matchAll(/name:\s*'([^']+)',[\s\S]*?price:\s*'\$([\d.]+)'/g))
  PRICES.set(name.toLowerCase(), Math.round(Number(price) * 100));

const PORT = Number(process.env.PORT) || 3101;

const user = { firstName: "Test", lastName: "Donut", email: "test@example.com" };
const addresses = [
  {
    id: "addr-home", label: "Home", addressType: "home", isDefault: true,
    addressLine1: "100 Queen St W", addressLine2: "", locality: "Toronto",
    administrativeDistrictLevel1: "ON", postalCode: "M5H 2N2", country: "CA",
  },
  {
    id: "addr-work", label: "Work", addressType: "work", isDefault: false,
    addressLine1: "3499 Bathurst St", addressLine2: "Unit 2", locality: "Toronto",
    administrativeDistrictLevel1: "ON", postalCode: "M6A 2C5", country: "CA",
  },
];

const session = (guest) => ({
  user: guest ? null : user,
  profile: guest ? null : { default_phone: "4165550199", default_address: addresses[0] },
  houseAccount: guest ? null : {
    id: "ha-1", organizationName: "Test Org", status: "active",
    credit: { available: 25000 }, creditEnabled: true,
    card: { brand: "Visa", last4: "1234" },
  },
});

const config = {
  environment: "sandbox",
  // applicationId / locationId intentionally omitted: no Square SDK, no card form.
  placesEnabled: false,
  delivery: {
    enabled: true, feeAmount: 800, freeThreshold: 5000, minimumAmount: 2000,
    schedule: { intervalMinutes: 30, deliveryStart: 6 * 60 + 30, deliveryEnd: 16 * 60 + 30 },
  },
};

const quote = (body) => {
  const subtotal = (body.items || []).reduce(
    (total, item) => total + (PRICES.get(String(item.name).toLowerCase()) ?? 0) * (item.quantity ?? 1), 0);
  const delivery = body.fulfillment?.type === "delivery";
  const free = subtotal >= config.delivery.freeThreshold;
  const fee = delivery && !free ? config.delivery.feeAmount : 0;
  const tax = Math.round((subtotal + fee) * 0.13);
  // Square folds the delivery fee into the order subtotal; the page subtracts it back out.
  return {
    order: { currency: "CAD", subtotal: subtotal + fee, tax, total: subtotal + fee + tax },
    ...(delivery ? { delivery: { fee, free } } : {}),
  };
};

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/^\/api/, "");
  const guest = /[?&]guest=1/.test(req.headers.referer || "");
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const body = raw ? JSON.parse(raw) : {};
    if (path === "/storefront/session") return json(res, 200, session(guest));
    if (path === "/storefront/config") return json(res, 200, config);
    if (path === "/storefront/addresses" && req.method === "GET") return json(res, 200, { addresses });
    if (path === "/storefront/addresses" && req.method === "POST") {
      if (body.isDefault) for (const item of addresses) item.isDefault = false;
      const address = { id: `addr-${Date.now()}`, ...body };
      addresses.push(address);
      return json(res, 201, { address });
    }
    const one = path.match(/^\/storefront\/addresses\/([^/]+)$/);
    if (one && req.method === "PATCH") {
      const index = addresses.findIndex((item) => item.id === one[1]);
      if (index < 0) return json(res, 404, { error: { message: "Address not found." } });
      if (body.isDefault) for (const item of addresses) item.isDefault = false;
      addresses[index] = { ...addresses[index], ...body };
      return json(res, 200, { address: addresses[index] });
    }
    if (one && req.method === "DELETE") {
      const index = addresses.findIndex((item) => item.id === one[1]);
      if (index < 0) return json(res, 404, { error: { message: "Address not found." } });
      const [removed] = addresses.splice(index, 1);
      if (removed.isDefault && addresses[0]) addresses[0].isDefault = true;
      res.writeHead(204);
      return res.end();
    }
    if (path === "/storefront/wishlist") return json(res, 200, { productIds: [] });
    if (path === "/storefront/catalog") return json(res, 200, { products: [] });
    if (path.endsWith("/storefront/quote")) return json(res, 200, quote(body));
    if (path.endsWith("/storefront/checkout"))
      return json(res, 400, { error: { message: "Mock API: orders cannot be placed here." } });
    return json(res, 404, { error: { message: `Mock API has no route for ${path}` } });
  });
}).listen(PORT, "127.0.0.1", () => console.log(`mock storefront on http://127.0.0.1:${PORT}`));

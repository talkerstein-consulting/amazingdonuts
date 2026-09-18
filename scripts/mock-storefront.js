/* Local-only stand-in for the house-accounts API.

   The real API refuses to boot without Square credentials, which keeps every
   secret off this machine — and also keeps the checkout page stuck on "the
   checkout service is unavailable", which hides step 3 entirely. This serves
   just enough of /api/storefront/* for the page to render every state:
   a signed-in customer with a saved address and a card on file, a quote that
   totals the bag, and a config with delivery on. Nothing here talks to
   Square; `applicationId` is deliberately absent so the payment SDK is never
   loaded and no card form can be submitted. Pay-on-account checkouts create
   in-memory test orders and credit activity; they never reach Square.

   Run with `npm run dev:api:mock` (or the "api-mock" launch config), and the
   Vite proxy on /api/house points here exactly as it would to the real API.

   Toggle the signed-in state with ?guest=1 on the checkout URL — the session
   route reads the Referer, so /checkout/?guest=1 shows the guest lanes. */
import { createServer } from "node:http";
import { PRODUCTS } from "../src/data/products.ts";
import { currentStatementWindow } from "../apps/house-accounts/apps/api/statement-preview.js";
import { statementPdf } from "../apps/house-accounts/apps/api/statements.js";

/* This local-only catalogue uses the repository fixtures; production reads Square. */
const PRICES = new Map(PRODUCTS.map(product => [product.name.toLowerCase(), Math.round(Number(product.price.slice(1)) * 100)]));
const catalogProducts = PRODUCTS.map(product => ({ name: product.name, price: PRICES.get(product.name.toLowerCase()), category: product.category, available: product.available !== false }));
const categories = [...new Set(catalogProducts.map(product => product.category).filter(Boolean))];

const PORT = Number(process.env.PORT) || 3101;
const creditLimit = 25000;
const orders = [];
const idempotentOrders = new Map();
const currentStatement = () => {
  const window = currentStatementWindow({ billing_frequency: "monthly", approved_at: new Date().toISOString() });
  const total = orders.reduce((sum, order) => sum + order.total, 0);
  return {
    statement_number: "Current statement", status: "draft", period_start: window.periodStart,
    period_end: window.periodEnd, next_statement_date: window.nextStatementDate,
    opening_balance: 0, new_charges: total, credits_and_payments: 0, closing_balance: total,
    currency: "CAD", due_at: null, snapshot: { entries: orders.map(order => ({
      effectiveAt: order.ordered_at, description: `Local test order ${order.id}`,
      amount: order.total, currency: "CAD", reference: order.id, source: "web",
      paymentMethod: "house_account", allocatedAmount: 0,
      lines: order.line_items.map(item => ({ name: `${item.name} x ${item.quantity}`, amount: item.total_money.amount })),
    })) }, payments: [],
    orderHistory: orders.map(order => ({ ...order, source: "web", first_name: "Test", last_name: "Donut" })),
  };
};

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
    role: "account_admin", organizationType: "Other business",
    credit: { available: creditLimit - orders.reduce((sum, order) => sum + order.total, 0) }, creditEnabled: true,
    card: { brand: "Visa", last4: "1234" },
  },
});

const config = {
  environment: "sandbox",
  // applicationId / locationId intentionally omitted: no Square SDK, no card form.
  placesEnabled: false,
  delivery: {
    enabled: true, feeAmount: 800, freeThreshold: 20000, minimumAmount: 2000,
    schedule: { intervalMinutes: 30, deliveryStart: 6 * 60 + 30, deliveryEnd: 16 * 60 + 30 },
  },
};

const quote = (body) => {
  const subtotal = (body.items || []).reduce(
    (total, item) => total + (PRICES.get(String(item.name).toLowerCase()) ?? 0) * (item.quantity ?? 1), 0);
  const delivery = body.fulfillment?.type === "delivery";
  const free = subtotal >= config.delivery.freeThreshold;
  const fee = delivery && !free ? config.delivery.feeAmount : 0;
  const discount = body.promoCode === "TEST10" ? Math.round(subtotal * 0.1) : 0;
  const tax = Math.round((subtotal - discount + fee) * 0.13);
  // Square folds the delivery fee into the order subtotal; the page subtracts it back out.
  return {
    order: { currency: "CAD", subtotal: subtotal + fee, discount, tax, total: subtotal - discount + fee + tax, taxes: [{ name: "HST", percentage: "13" }] },
    ...(delivery ? { delivery: { fee, free } } : {}),
  };
};

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const account = () => {
  const outstanding = orders.reduce((sum, order) => sum + order.total, 0);
  return {
    id: "ha-1", organization_name: "Test Org", billing_contact: "Test Donut",
    billing_email: user.email, status: "active", metadata: { organizationType: "Other business", address: addresses[1] },
    credit: { creditLimit, outstanding, available: creditLimit - outstanding },
    orders: orders.map(order => ({
      id: order.id, square_order_id: order.id, receipt_number: order.id,
      ordered_at: order.ordered_at, payment_method: "house_account", source: "web",
      balance_due: order.total, total: order.total, currency: "CAD",
    })),
    ledger: orders.map(order => ({
      id: `ledger-${order.id}`, source_id: order.id, description: `Local test order ${order.id}`,
      effective_at: order.ordered_at, amount: order.total, currency: "CAD",
    })),
    currentStatement: currentStatement(), statements: [], payments: [],
    cards: [{ id: "mock-card", card_brand: "Visa", last_4: "1234", status: "active" }],
    purchasers: [{ id: "mock-user", first_name: user.firstName, last_name: user.lastName,
      email: user.email, role: "account_admin", organization_role: "owner",
      purchase_limit: null, status: "active", has_pin: true }],
  };
};

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/^\/api/, "");
  const guest = /[?&]guest=1/.test(req.headers.referer || "");
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", async () => {
    const body = raw ? JSON.parse(raw) : {};
    if (path === "/storefront/session") return json(res, 200, session(guest));
    if (path === "/storefront/config") return json(res, 200, config);
    if (path === "/storefront/orders" && req.method === "GET") return json(res, 200, { orders });
    if (path === "/storefront/house-application" && req.method === "GET") return json(res, 200, { application: null });
    if (path === "/portal/account" && req.method === "GET") return json(res, 200, { account: account() });
    if (path === "/storefront/current-statement.pdf" && req.method === "GET") {
      const pdf = await statementPdf(currentStatement(), { name: "Amazing Donuts", brand: { accent: "#ff6438" } }, { organization_name: "Test Org", billing_contact: "Test Donut" });
      res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=local-current-statement.pdf", "Cache-Control": "private, no-store" });
      return res.end(pdf);
    }
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
    if (path === "/storefront/catalog") return json(res, 200, { products: catalogProducts, categories });
    if (path === "/public/storefront/promo-code") return body.code === "TEST10"
      ? json(res, 200, { valid: true, code: "TEST10", name: "Local test 10%" })
      : json(res, 400, { error: { message: "This promo code is unavailable." } });
    if (path.endsWith("/storefront/quote")) return body.promoCode && body.promoCode !== "TEST10"
      ? json(res, 400, { error: { message: "This promo code is unavailable." } })
      : json(res, 200, quote(body));
    if (path === "/storefront/checkout" && req.method === "POST") {
      if (guest || body.paymentMethod !== "house_account")
        return json(res, 400, { error: { message: "Only simulated Pay on account orders are available in the local preview." } });
      if (!Array.isArray(body.items) || !body.items.length || !body.items.every(item =>
        Number.isInteger(item.quantity) && item.quantity > 0 && PRICES.has(String(item.name).toLowerCase())))
        return json(res, 400, { error: { message: "Add valid products before placing a test order." } });
      if (!/^\d{4,8}$/.test(String(body.authorizationPin || "")))
        return json(res, 400, { error: { message: "Enter a 4-8 digit authorization PIN for this test order." } });
      if (!body.fulfillment || !["pickup", "delivery"].includes(body.fulfillment.type))
        return json(res, 400, { error: { message: "Select pickup or delivery before placing a test order." } });
      if (!body.idempotencyKey)
        return json(res, 400, { error: { message: "A checkout idempotency key is required." } });
      const previous = idempotentOrders.get(body.idempotencyKey);
      if (previous) return json(res, 200, { order: previous });
      if (body.promoCode && body.promoCode !== "TEST10")
        return json(res, 400, { error: { message: "This promo code is unavailable." } });
      const priced = quote(body).order;
      if (priced.total > account().credit.available)
        return json(res, 400, { error: { message: "This test order exceeds the institutional credit available." } });
      const id = `TEST-${Date.now().toString(36).toUpperCase()}-${(orders.length + 1).toString().padStart(3, "0")}`;
      const order = {
        id, ordered_at: new Date().toISOString(), simulated: true,
        payment_method: "house_account", paymentStatus: "On account",
        fulfillmentStatus: "Local test order", fulfillment: body.fulfillment,
        scheduledAt: body.fulfillment.scheduledAt, currency: "CAD", total: priced.total,
        taxes: priced.taxes,
        breakdown: { merchandise: priced.subtotal - (quote(body).delivery?.fee || 0),
          discount: priced.discount, deliveryFee: quote(body).delivery?.fee || 0,
          tax: priced.tax, tip: 0, total: priced.total },
        line_items: body.items.map((item, index) => ({
          uid: `${id}-${index}`, name: item.name, quantity: item.quantity,
          total_money: { amount: PRICES.get(item.name.toLowerCase()) * item.quantity, currency: "CAD" },
        })),
      };
      orders.unshift(order);
      idempotentOrders.set(body.idempotencyKey, order);
      return json(res, 200, { order });
    }
    if (path.endsWith("/storefront/checkout"))
      return json(res, 400, { error: { message: "Only simulated Pay on account orders are available in the local preview." } });
    return json(res, 404, { error: { message: `Mock API has no route for ${path}` } });
  });
}).listen(PORT, "127.0.0.1", () => console.log(`mock storefront on http://127.0.0.1:${PORT}`));

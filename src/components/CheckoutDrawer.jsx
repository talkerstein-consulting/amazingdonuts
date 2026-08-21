import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { cartTotal, checkoutLineItems } from "../lib/squareCart.js";

const currency = (amount, code = "CAD") => new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: code
}).format(amount / 100);

function tomorrowAtNoon() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T12:00`;
}

function zonedLocalToIso(value, timeZone) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const initial = new Date(desired);
  const parts = Object.fromEntries(formatter.formatToParts(initial).map((part) => [part.type, part.value]));
  const represented = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(desired + (desired - represented)).toISOString();
}

function loadSquare(environment) {
  if (window.Square) return Promise.resolve(window.Square);
  const source = environment === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${source}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Square), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = source;
    script.async = true;
    script.onload = () => resolve(window.Square);
    script.onerror = () => reject(new Error("Square's secure payment form could not load."));
    document.head.appendChild(script);
  });
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  return value.startsWith("+") ? `+${digits}` : digits.length ? `+${digits}` : "";
}

export default function CheckoutDrawer({ cart, open, onOpen, onRemove, onQuantity, onComplete }) {
  const [config, setConfig] = useState(null);
  const [location, setLocation] = useState(null);
  const [card, setCard] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const cardRef = useRef(null);
  const paymentCardRef = useRef(null);
  const total = useMemo(() => cartTotal(cart), [cart]);

  useEffect(() => {
    if (!open || config) return;
    Promise.all([
      fetch("/api/checkout/config").then((response) => response.json()),
      fetch("/api/locations").then((response) => response.json())
    ]).then(([nextConfig, locations]) => {
      setConfig(nextConfig);
      setLocation(locations.locations?.find((item) => item.id === nextConfig.locationId) || locations.locations?.[0] || null);
    }).catch(() => setError("The bakery connection is temporarily unavailable."));
  }, [open, config]);

  useEffect(() => {
    if (!open || !config?.applicationId || !config.locationId || paymentCardRef.current || !cardRef.current) return;
    let disposed = false;
    let attachedCard;
    loadSquare(config.environment).then(async (Square) => {
      const payments = Square.payments(config.applicationId, config.locationId);
      attachedCard = await payments.card();
      await attachedCard.attach(cardRef.current);
      if (!disposed) {
        paymentCardRef.current = attachedCard;
        setCard(attachedCard);
      }
    }).catch((cause) => setError(cause.message || "The secure payment form could not start."));
    return () => {
      disposed = true;
      attachedCard?.destroy?.();
      paymentCardRef.current = null;
      setCard(null);
    };
  }, [open, config]);

  useEffect(() => {
    if (!open) {
      setError("");
      setStatus("idle");
    }
  }, [open]);

  const submit = async (event) => {
    event.preventDefault();
    if (!config || !cart.length) return;
    setStatus("paying");
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      let sourceId;
      if (card) {
        const tokenResult = await card.tokenize();
        if (tokenResult.status !== "OK") throw new Error(tokenResult.errors?.[0]?.message || "Please check the card details.");
        sourceId = tokenResult.token;
      }
      const order = {
        idempotencyKey: crypto.randomUUID(),
        locationId: config.locationId,
        customer: {
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          phone: normalizePhone(form.get("phone"))
        },
        lineItems: checkoutLineItems(cart),
        fulfillment: {
          type: "PICKUP",
          scheduledAt: zonedLocalToIso(form.get("scheduledAt"), location?.timezone || "America/Toronto"),
          note: form.get("note") || undefined
        }
      };
      const response = await fetch(card ? "/api/checkout/payment" : "/api/checkout/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceId ? { ...order, sourceId } : order)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Square could not complete the payment.");
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setConfirmation(result);
      setStatus("complete");
      onComplete();
    } catch (cause) {
      setStatus("idle");
      setError(cause.message || "Payment could not be completed.");
    }
  };

  return (
    <>
      <button className="cart-fab" type="button" onClick={() => onOpen(true)} aria-label={`Open cart, ${cart.length} items`} title="Cart">
        <ShoppingBag aria-hidden="true" />
        {cart.length ? <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span> : null}
      </button>
      {open ? <button className="checkout-scrim" type="button" aria-label="Close cart" onClick={() => onOpen(false)} /> : null}
      <aside className={`checkout${open ? " is-open" : ""}`} aria-hidden={!open} aria-label="Cart and checkout">
        <header className="checkout__head">
          <div><p>Your order</p><h2>{confirmation ? "Order received" : "The donut box"}</h2></div>
          <button type="button" onClick={() => onOpen(false)} aria-label="Close cart" title="Close"><X /></button>
        </header>

        {confirmation ? (
          <div className="checkout__success">
            <span>Paid</span>
            <h3>Square has the order.</h3>
            <p>The bakery can now see and fulfill it in Square Order Manager.</p>
            <dl><dt>Order</dt><dd>{confirmation.orderId}</dd><dt>Total</dt><dd>{currency(confirmation.totalMoney.amount, confirmation.totalMoney.currency)}</dd></dl>
            {confirmation.receiptUrl ? <a href={confirmation.receiptUrl} target="_blank" rel="noreferrer">View Square receipt</a> : null}
          </div>
        ) : (
          <>
            <div className="checkout__items">
              {!cart.length ? <p className="checkout__empty">Your box is empty. The builders are ready when you are.</p> : cart.map((item) => (
                <article className="cart-line" key={item.id}>
                  <img src={item.imageUrl} alt="" />
                  <div><h3>{item.name}</h3><p>{item.description}</p><strong>{currency(item.priceMoney.amount * item.quantity, item.priceMoney.currency)}</strong></div>
                  <div className="cart-line__acts">
                    <button type="button" onClick={() => onQuantity(item.id, -1)} aria-label={`Decrease ${item.name}`} title="Decrease"><Minus /></button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => onQuantity(item.id, 1)} aria-label={`Increase ${item.name}`} title="Increase"><Plus /></button>
                    <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`} title="Remove"><Trash2 /></button>
                  </div>
                </article>
              ))}
            </div>

            {cart.length ? (
              <form className="checkout__form" onSubmit={submit}>
                <div className="checkout__total"><span>Estimated total</span><strong>{currency(total)}</strong></div>
                <p className="checkout__tax">Square applies the current catalog prices, taxes, and discounts before charging.</p>
                <div className="checkout__fields checkout__fields--two">
                  <label><span>First name</span><input name="firstName" autoComplete="given-name" required /></label>
                  <label><span>Last name</span><input name="lastName" autoComplete="family-name" required /></label>
                </div>
                <div className="checkout__fields">
                  <label><span>Email</span><input type="email" name="email" autoComplete="email" required /></label>
                  <label><span>Phone</span><input type="tel" name="phone" autoComplete="tel" placeholder="416 555 0100" required /></label>
                  <label><span>Pickup at {location?.name || "Amazing Donuts"} ({location?.timezone || "Toronto time"})</span><input type="datetime-local" name="scheduledAt" defaultValue={tomorrowAtNoon()} required /></label>
                  <label><span>Order note</span><textarea name="note" maxLength="500" rows="2" /></label>
                </div>
                <div className="checkout__card" ref={cardRef} />
                {!config?.applicationId && config ? <p className="checkout__notice">Card payment will continue on Square's secure checkout page.</p> : null}
                {error ? <p className="checkout__error" role="alert">{error}</p> : null}
                <button className="checkout__pay" type="submit" disabled={!config || status === "paying"}>{status === "paying" ? "Processing..." : card ? `Pay ${currency(total)}` : "Continue to Square"}</button>
              </form>
            ) : null}
          </>
        )}
      </aside>
    </>
  );
}

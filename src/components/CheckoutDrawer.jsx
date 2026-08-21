import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { cartTotal, checkoutLineItems } from "../lib/squareCart.js";

const currency = (amount, code = "CAD") => new Intl.NumberFormat("en-CA", { style: "currency", currency: code }).format(Number(amount || 0) / 100);
const STORE_TIME_ZONE = "America/Toronto";
const STORE_HOURS = { 0: [480, 780], 1: [450, 960], 2: [450, 960], 3: [450, 960], 4: [450, 960], 5: [450, 780] };

function dateKey(date, timeZone = STORE_TIME_ZONE) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function addDays(key, days) { const date = new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
function zonedLocalToIso(value, timeZone) {
  const [date, time] = value.split("T"); const [year, month, day] = date.split("-").map(Number); const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(desired)).map((part) => [part.type, part.value]));
  return new Date(desired + (desired - Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute))).toISOString();
}
function pickupTimes(key) {
  const hours = STORE_HOURS[new Date(`${key}T12:00:00Z`).getUTCDay()]; if (!hours) return [];
  const options = [];
  for (let minutes = hours[0]; minutes < hours[1]; minutes += 30) {
    const value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    if (new Date(zonedLocalToIso(`${key}T${value}`, STORE_TIME_ZONE)).getTime() >= Date.now() + 60 * 60_000) options.push({ value, label: new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2020, 0, 1, Math.floor(minutes / 60), minutes % 60))) });
  }
  return options;
}
function pickupDates() {
  const today = dateKey(new Date());
  return Array.from({ length: 31 }, (_, index) => addDays(today, index)).filter((key) => pickupTimes(key).length).map((key) => ({ value: key, label: new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)) }));
}
function loadSquare(environment) {
  if (window.Square) return Promise.resolve(window.Square);
  const source = environment === "production" ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js";
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${source}"]`);
    if (existing) { existing.addEventListener("load", () => resolve(window.Square), { once: true }); existing.addEventListener("error", reject, { once: true }); return; }
    const script = document.createElement("script"); script.src = source; script.async = true; script.onload = () => resolve(window.Square); script.onerror = () => reject(new Error("Square's secure payment form could not load.")); document.head.appendChild(script);
  });
}
function normalizePhone(value) { const digits = String(value || "").replace(/\D/g, ""); return digits.length === 10 ? `+1${digits}` : value?.startsWith("+") ? `+${digits}` : digits ? `+${digits}` : ""; }
const blankAddress = { addressLine1: "", addressLine2: "", locality: "Toronto", administrativeDistrictLevel1: "ON", postalCode: "", country: "CA", deliveryInstructions: "" };

export default function CheckoutDrawer({ cart, open, onOpen, onRemove, onQuantity, onComplete, user, houseAccount }) {
  const [config, setConfig] = useState(null); const [location, setLocation] = useState(null);
  const [card, setCard] = useState(null); const [wallets, setWallets] = useState({}); const [savedCards, setSavedCards] = useState([]); const [addresses, setAddresses] = useState([]);
  const [status, setStatus] = useState("idle"); const [error, setError] = useState(""); const [confirmation, setConfirmation] = useState(null); const [quote, setQuote] = useState(null);
  const [fulfillmentType, setFulfillmentType] = useState("PICKUP"); const [address, setAddress] = useState(blankAddress);
  const [customer, setCustomer] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [tipChoice, setTipChoice] = useState("0"); const [customTip, setCustomTip] = useState(""); const [paymentSource, setPaymentSource] = useState("new");
  const [paymentMode, setPaymentMode] = useState("square");
  const dates = useMemo(() => pickupDates(), []); const [pickupDate, setPickupDate] = useState(() => pickupDates()[0]?.value || "");
  const times = useMemo(() => pickupTimes(pickupDate), [pickupDate]); const [pickupTime, setPickupTime] = useState(() => pickupTimes(pickupDates()[0]?.value || "")[0]?.value || "");
  const cardRef = useRef(null); const paymentsRef = useRef(null); const paymentCardRef = useRef(null); const checkoutRef = useRef(null);
  const estimate = useMemo(() => cartTotal(cart), [cart]); const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const baseAmount = Number(quote?.totalMoney?.amount ?? estimate); const tipAmount = paymentMode === "house" ? 0 : tipChoice === "custom" ? Math.max(0, Math.round(Number(customTip || 0) * 100)) : Math.round(baseAmount * Number(tipChoice) / 100); const payableAmount = baseAmount + tipAmount;
  const locationName = /default test account/i.test(location?.name || "") ? "Amazing Donuts, Bathurst Street" : location?.name || "Amazing Donuts, Bathurst Street";

  useEffect(() => { if (!times.some((option) => option.value === pickupTime)) setPickupTime(times[0]?.value || ""); }, [pickupTime, times]);
  useEffect(() => { if (user) setCustomer({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone }); }, [user]);
  useEffect(() => {
    if (!open || config) return;
    Promise.all([fetch("/api/checkout/config").then((r) => r.json()), fetch("/api/locations").then((r) => r.json())]).then(([next, locations]) => { setConfig(next); setLocation(locations.locations?.find((item) => item.id === next.locationId) || locations.locations?.[0] || null); }).catch(() => setError("The bakery connection is temporarily unavailable."));
  }, [open, config]);
  useEffect(() => {
    if (!open || !user) { setSavedCards([]); setAddresses([]); return; }
    Promise.all([fetch("/api/account/cards").then((r) => r.json()), fetch("/api/account/addresses").then((r) => r.json())]).then(([cardsBody, addressBody]) => {
      setSavedCards(cardsBody.cards || []); setAddresses(addressBody.addresses || []);
      const preferred = addressBody.addresses?.find((item) => item.isDefault) || addressBody.addresses?.[0]; if (preferred) setAddress(preferred);
    }).catch(() => {});
  }, [open, user]);
  useEffect(() => {
    if (!open || !config?.applicationId || !config.locationId || paymentCardRef.current || !cardRef.current) return;
    let disposed = false; let attached;
    loadSquare(config.environment).then(async (Square) => { const payments = Square.payments(config.applicationId, config.locationId); paymentsRef.current = payments; attached = await payments.card(); await attached.attach(cardRef.current); if (!disposed) { paymentCardRef.current = attached; setCard(attached); } }).catch((cause) => setError(cause.message || "The secure payment form could not start."));
    return () => { disposed = true; attached?.destroy?.(); paymentCardRef.current = null; paymentsRef.current = null; setCard(null); };
  }, [open, config]);

  const fulfillment = useMemo(() => ({ type: fulfillmentType, scheduledAt: pickupDate && pickupTime ? zonedLocalToIso(`${pickupDate}T${pickupTime}`, STORE_TIME_ZONE) : "", ...(fulfillmentType === "DELIVERY" ? { address: { addressLine1: address.addressLine1, addressLine2: address.addressLine2 || undefined, locality: address.locality, administrativeDistrictLevel1: address.administrativeDistrictLevel1, postalCode: address.postalCode, country: "CA" }, note: address.deliveryInstructions || undefined } : {}) }), [fulfillmentType, pickupDate, pickupTime, address]);
  useEffect(() => {
    if (!open || !config?.locationId || !cart.length || !fulfillment.scheduledAt || (fulfillmentType === "DELIVERY" && (!address.addressLine1 || !address.postalCode))) { setQuote(null); return; }
    const controller = new AbortController(); const timer = setTimeout(() => {
      fetch(paymentMode === "house" ? "/api/house/quote" : "/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), locationId: config.locationId, customer: { firstName: "Quote", lastName: "Customer", email: "quote@example.com", phone: "+14165550100" }, lineItems: checkoutLineItems(cart), fulfillment }) }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message); setQuote(body); }).catch((cause) => { if (cause.name !== "AbortError") setQuote(null); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, config, cart, fulfillment, fulfillmentType, address.addressLine1, address.postalCode, paymentMode]);

  useEffect(() => {
    if (!paymentsRef.current || !quote?.totalMoney || !open || paymentMode === "house") return;
    let active = true; const created = [];
    const paymentRequest = paymentsRef.current.paymentRequest({ countryCode: "CA", currencyCode: quote.totalMoney.currency || "CAD", total: { amount: (payableAmount / 100).toFixed(2), label: "Amazing Donuts" } });
    Promise.allSettled([paymentsRef.current.applePay(paymentRequest), paymentsRef.current.googlePay(paymentRequest)]).then(([apple, google]) => { if (!active) return; if (apple.status === "fulfilled") created.push(apple.value); if (google.status === "fulfilled") created.push(google.value); setWallets({ ...(apple.status === "fulfilled" ? { apple: apple.value } : {}), ...(google.status === "fulfilled" ? { google: google.value } : {}) }); });
    return () => { active = false; created.forEach((method) => method.destroy?.()); setWallets({}); };
  }, [quote, payableAmount, open, paymentMode]);
  useEffect(() => { if (open) checkoutRef.current?.scrollTo({ top: 0 }); else { setError(""); setStatus("idle"); } }, [open]);
  useEffect(() => { if (confirmation && cart.length) setConfirmation(null); }, [cart.length, confirmation]);

  const pay = async (event) => {
    event.preventDefault(); if (!config || !cart.length || !quote) return; setStatus("paying"); setError("");
    try {
      const form = new FormData(event.currentTarget);
      if (paymentMode === "house") {
        const response = await fetch("/api/house/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), locationId: config.locationId, customer, lineItems: checkoutLineItems(cart), fulfillment: { ...fulfillment, note: form.get("note") || fulfillment.note || undefined }, poNumber: form.get("poNumber") || undefined }) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || "The House Account order could not be placed.");
        setConfirmation({ ...result, paymentStatus: "HOUSE_ACCOUNT" }); setStatus("complete"); onComplete(); return;
      }
      const method = event.nativeEvent.submitter?.value || "card"; let sourceId; let paymentMethod = card;
      if (paymentSource !== "new") sourceId = paymentSource; else if (method === "apple") paymentMethod = wallets.apple; else if (method === "google") paymentMethod = wallets.google;
      if (!sourceId) { const token = await paymentMethod.tokenize(); if (token.status !== "OK") throw new Error(token.errors?.[0]?.message || "Please check the payment details."); sourceId = token.token; }
      let verificationToken;
      if (paymentsRef.current?.verifyBuyer) {
        const verified = await paymentsRef.current.verifyBuyer(sourceId, { amount: (payableAmount / 100).toFixed(2), currencyCode: quote.totalMoney.currency || "CAD", intent: "CHARGE", customerInitiated: true, sellerKeyedIn: false, billingContact: { givenName: customer.firstName, familyName: customer.lastName, email: customer.email, phone: normalizePhone(customer.phone), countryCode: "CA" } }); verificationToken = verified?.token;
      }
      const order = { idempotencyKey: crypto.randomUUID(), locationId: config.locationId, customer: { ...customer, phone: normalizePhone(customer.phone) }, lineItems: checkoutLineItems(cart), fulfillment: { ...fulfillment, note: form.get("note") || fulfillment.note || undefined }, sourceId, tipAmount, verificationToken, saveCard: Boolean(user && paymentSource === "new" && form.get("saveCard")) };
      const response = await fetch("/api/checkout/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) }); const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || "Square could not complete the payment.");
      setConfirmation(result); setStatus("complete"); onComplete();
    } catch (cause) { setStatus("idle"); setError(cause.message || "Payment could not be completed."); }
  };

  return <>
    <button className="cart-fab" type="button" onClick={() => onOpen(true)} aria-label={`Open cart, ${cartCount} items`} title="Cart"><ShoppingBag />{cartCount ? <span>{cartCount}</span> : null}</button>
    {open ? <button className="checkout-scrim" type="button" aria-label="Close cart" onClick={() => onOpen(false)} /> : null}
    <aside ref={checkoutRef} className={`checkout${open ? " is-open" : ""}`} aria-hidden={!open} aria-label="Cart and checkout">
      <header className="checkout__head"><div><p>Your order</p><h2>{confirmation ? "Order received" : "The donut box"}</h2></div><button type="button" onClick={() => onOpen(false)} aria-label="Close cart" title="Close"><X /></button></header>
      {confirmation ? <div className="checkout__success"><span>{confirmation.paymentStatus === "HOUSE_ACCOUNT" ? "On account" : "Paid"}</span><h3>Square has the order.</h3><p>The bakery can now see and fulfill it in Square Order Manager.</p><dl><dt>Order</dt><dd>{confirmation.orderId}</dd><dt>Total</dt><dd>{currency(confirmation.totalMoney.amount, confirmation.totalMoney.currency)}</dd></dl>{confirmation.receiptUrl ? <a href={confirmation.receiptUrl} target="_blank" rel="noreferrer">View Square receipt</a> : null}<button className="checkout__pay checkout__again" type="button" onClick={() => { setConfirmation(null); onOpen(false); document.querySelector("#menu")?.scrollIntoView({ block: "start" }); }}>Start another order</button></div> : <>
        <div className="checkout__items">{!cart.length ? <p className="checkout__empty">Your box is empty. Today’s Square menu and both builders are ready when you are.</p> : cart.map((item) => <article className="cart-line" key={item.id}><img src={item.imageUrl} alt="" /><div><h3>{item.name}</h3><p>{item.description}</p><strong>{currency(item.priceMoney.amount * item.quantity, item.priceMoney.currency)}</strong></div><div className="cart-line__acts"><button type="button" onClick={() => onQuantity(item.id, -1)} aria-label={`Decrease ${item.name}`}><Minus /></button><span>{item.quantity}</span><button type="button" onClick={() => onQuantity(item.id, 1)} aria-label={`Increase ${item.name}`}><Plus /></button><button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}><Trash2 /></button></div></article>)}</div>
        {cart.length ? <form className="checkout__form" onSubmit={pay}>
          <div className="checkout__total"><span>{quote ? "Square total" : "Estimated total"}</span><strong>{currency(payableAmount)}</strong></div><p className="checkout__tax">{quote ? `${currency(quote.taxMoney?.amount || 0)} tax${quote.serviceChargeMoney?.amount ? ` · ${currency(quote.serviceChargeMoney.amount)} delivery` : ""}${tipAmount ? ` · ${currency(tipAmount)} tip` : ""}` : "Square is calculating current prices and taxes."}</p>
          {config?.houseAccountsEnabled && houseAccount?.status === "active" ? <div className="payment-mode"><button type="button" aria-pressed={paymentMode === "square"} onClick={() => setPaymentMode("square")}>Pay now</button><button type="button" aria-pressed={paymentMode === "house"} onClick={() => setPaymentMode("house")}>Charge to account</button></div> : null}
          {config?.deliveryEnabled ? <div className="fulfillment-toggle"><button type="button" aria-pressed={fulfillmentType === "PICKUP"} onClick={() => setFulfillmentType("PICKUP")}><ShoppingBag />Pickup</button><button type="button" aria-pressed={fulfillmentType === "DELIVERY"} onClick={() => setFulfillmentType("DELIVERY")}><Truck />Delivery</button></div> : null}
          <div className="checkout__fields checkout__fields--two"><label><span>First name</span><input value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} autoComplete="given-name" required /></label><label><span>Last name</span><input value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} autoComplete="family-name" required /></label></div>
          <div className="checkout__fields"><label><span>Email</span><input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} autoComplete="email" required /></label><label><span>Phone</span><input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} autoComplete="tel" required /></label><label><span>{fulfillmentType === "PICKUP" ? "Pickup" : "Bakery"} location</span><select value={config?.locationId || ""} disabled><option value={config?.locationId || ""}>{locationName}</option></select></label>
            {fulfillmentType === "DELIVERY" ? <div className="delivery-fields"><label><span>Saved address</span><select value={address.id || "custom"} onChange={(e) => setAddress(addresses.find((item) => item.id === e.target.value) || blankAddress)}><option value="custom">Enter an address</option>{addresses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label><span>Street address</span><input value={address.addressLine1} onChange={(e) => setAddress({ ...address, id: undefined, addressLine1: e.target.value })} required /></label><label><span>Unit</span><input value={address.addressLine2 || ""} onChange={(e) => setAddress({ ...address, id: undefined, addressLine2: e.target.value })} /></label><div className="checkout__fields checkout__fields--two"><label><span>City</span><input value={address.locality} onChange={(e) => setAddress({ ...address, id: undefined, locality: e.target.value })} required /></label><label><span>Postal code</span><input value={address.postalCode} onChange={(e) => setAddress({ ...address, id: undefined, postalCode: e.target.value })} required /></label></div></div> : null}
            <div className="checkout__fields checkout__fields--two checkout__schedule"><label><span>{fulfillmentType === "PICKUP" ? "Pickup" : "Delivery"} date</span><select value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required>{dates.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label><span>Time (Toronto)</span><select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} required>{times.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>{paymentMode === "house" ? <label><span>PO or reference number</span><input name="poNumber" maxLength="100" /></label> : null}<label><span>Order note</span><textarea name="note" maxLength="500" rows="2" /></label>
          </div>
          {paymentMode === "square" && config?.tippingEnabled ? <fieldset className="tip-field"><legend>Add a tip for the bakery team</legend><div>{["0","10","15","18","custom"].map((value) => <button type="button" key={value} aria-pressed={tipChoice === value} onClick={() => setTipChoice(value)}>{value === "0" ? "No tip" : value === "custom" ? "Custom" : `${value}%`}</button>)}</div>{tipChoice === "custom" ? <label><span>Custom tip</span><input type="number" min="0" step="0.01" value={customTip} onChange={(e) => setCustomTip(e.target.value)} /></label> : null}</fieldset> : null}
          {paymentMode === "square" && savedCards.length ? <fieldset className="saved-payment"><legend>Payment method</legend><label><input type="radio" checked={paymentSource === "new"} onChange={() => setPaymentSource("new")} /><span>New card or digital wallet</span></label>{savedCards.map((saved) => <label key={saved.id}><input type="radio" checked={paymentSource === saved.id} onChange={() => setPaymentSource(saved.id)} /><span>{saved.brand} ending in {saved.last4}</span></label>)}</fieldset> : null}
          <div className={paymentMode === "square" && paymentSource === "new" ? "checkout__card" : "checkout__card is-hidden"} ref={cardRef} />
          {paymentMode === "square" && user && paymentSource === "new" ? <label className="save-card"><input type="checkbox" name="saveCard" /><span>Save this card securely with Square for future orders</span></label> : null}
          {paymentMode === "square" && paymentSource === "new" && (wallets.apple || wallets.google) ? <div className="wallet-buttons">{wallets.apple ? <button type="submit" value="apple" className="wallet-apple">Pay</button> : null}{wallets.google ? <button type="submit" value="google" className="wallet-google">G Pay</button> : null}</div> : null}
          {!config?.applicationId && config ? <p className="checkout__notice">Card payment will continue on Square’s secure checkout page.</p> : null}{error ? <p className="checkout__error" role="alert">{error}</p> : null}
          <button className="checkout__pay" type="submit" value="card" disabled={!config || !quote || status === "paying" || Boolean(paymentMode === "square" && paymentSource === "new" && config.applicationId && !card)}>{status === "paying" ? "Processing…" : !quote ? "Calculating total…" : paymentMode === "house" ? `Charge ${currency(payableAmount)} to account` : `Pay ${currency(payableAmount)}`}</button>
        </form> : null}</>}
    </aside>
  </>;
}

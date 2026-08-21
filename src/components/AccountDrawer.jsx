import { useCallback, useEffect, useState } from "react";
import { Building2, CreditCard, Download, FileText, LogOut, MapPin, Package, RotateCcw, ShieldCheck, Trash2, X } from "lucide-react";

const money = (value) => new Intl.NumberFormat("en-CA", { style: "currency", currency: value?.currency || "CAD" }).format(Number(value?.amount || 0) / 100);
const dateOnly = (value) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value));
const request = async (url, options) => {
  const response = await fetch(url, options);
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Something went wrong.");
  return body;
};

function AuthForm({ mode, setMode, onUser }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const digits = String(form.get("phone") || "").replace(/\D/g, "");
    try {
      const body = await request(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"), password: form.get("password"),
          ...(register ? { firstName: form.get("firstName"), lastName: form.get("lastName"), phone: digits.length === 10 ? `+1${digits}` : `+${digits}` } : {})
        })
      });
      onUser(body.user);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };
  return <div className="account-auth">
    <p className="eyebrow">{register ? "A faster next order" : "Welcome back"}</p>
    <h3>{register ? "Create your account" : "Sign in"}</h3>
    <form onSubmit={submit}>
      {register ? <div className="account-form__two"><label><span>First name</span><input name="firstName" autoComplete="given-name" required /></label><label><span>Last name</span><input name="lastName" autoComplete="family-name" required /></label></div> : null}
      <label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
      {register ? <label><span>Phone</span><input name="phone" type="tel" autoComplete="tel" required /></label> : null}
      <label><span>Password</span><input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength="10" required /></label>
      {error ? <p className="account-error" role="alert">{error}</p> : null}
      <button className="account-primary" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
    </form>
    <button className="account-switch" type="button" onClick={() => setMode(register ? "login" : "register")}>{register ? "Already have an account? Sign in" : "New here? Create an account"}</button>
  </div>;
}

function Orders({ onReorder }) {
  const [orders, setOrders] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);
  const [message, setMessage] = useState("");
  useEffect(() => { request("/api/account/orders").then((body) => setOrders(body.orders)).catch((error) => setMessage(error.message)); }, []);
  const refund = async (event) => {
    event.preventDefault(); setMessage("");
    try {
      await request(`/api/account/orders/${refundOrder.id}/refund-request`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: new FormData(event.currentTarget).get("reason") }) });
      setMessage("Refund request sent to Amazing Donuts."); setRefundOrder(null);
    } catch (error) { setMessage(error.message); }
  };
  return <div className="account-view">
    <h3>Your orders</h3>
    {message ? <p className="account-notice" role="status">{message}</p> : null}
    {!orders ? <p>Loading orders…</p> : !orders.length ? <p>No orders yet. Your first box is waiting in the menu.</p> : <div className="account-orders">{orders.map((order) => <article key={order.id}>
      <div><strong>{new Date(order.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</strong><span>{order.state} · {order.fulfillmentType || "Order"}</span></div>
      <p>{order.lineItems.map((item) => `${item.quantity}× ${item.name}`).join(", ")}</p>
      <div className="account-order__foot"><strong>{money(order.totalMoney)}</strong><div><button type="button" onClick={() => onReorder(order)} title="Reorder"><RotateCcw /> Reorder</button><button type="button" onClick={() => setRefundOrder(order)}>Request refund</button></div></div>
    </article>)}</div>}
    {refundOrder ? <form className="refund-form" onSubmit={refund}><h4>Refund request</h4><p>Order {refundOrder.id}</p><label><span>Tell us what happened</span><textarea name="reason" minLength="10" maxLength="1000" rows="4" required /></label><div><button type="button" onClick={() => setRefundOrder(null)}>Cancel</button><button className="account-primary">Send request</button></div></form> : null}
  </div>;
}

function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [error, setError] = useState("");
  const load = useCallback(() => request("/api/account/addresses").then((body) => setAddresses(body.addresses)).catch((cause) => setError(cause.message)), []);
  useEffect(() => { load(); }, [load]);
  const submit = async (event) => {
    event.preventDefault(); setError(""); const form = new FormData(event.currentTarget);
    try {
      await request("/api/account/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(form), isDefault: form.get("isDefault") === "true" }) });
      event.currentTarget.reset(); await load();
    } catch (cause) { setError(cause.message); }
  };
  return <div className="account-view"><h3>Saved addresses</h3>
    <div className="saved-list">{addresses.map((address) => <article key={address.id}><MapPin /><div><strong>{address.label}{address.isDefault ? " · Default" : ""}</strong><p>{address.addressLine1}, {address.locality}, {address.administrativeDistrictLevel1} {address.postalCode}</p></div><button type="button" aria-label={`Delete ${address.label}`} title="Delete" onClick={async () => { await request(`/api/account/addresses/${address.id}`, { method: "DELETE" }); load(); }}><Trash2 /></button></article>)}</div>
    <form className="account-form" onSubmit={submit}><h4>Add an address</h4><label><span>Label</span><input name="label" placeholder="Home, office, school" required /></label><label><span>Street address</span><input name="addressLine1" autoComplete="address-line1" required /></label><label><span>Unit</span><input name="addressLine2" autoComplete="address-line2" /></label><div className="account-form__two"><label><span>City</span><input name="locality" defaultValue="Toronto" required /></label><label><span>Postal code</span><input name="postalCode" autoComplete="postal-code" required /></label></div><input type="hidden" name="administrativeDistrictLevel1" value="ON" /><input type="hidden" name="country" value="CA" /><label><span>Delivery instructions</span><textarea name="deliveryInstructions" rows="2" /></label><label className="account-check"><input type="checkbox" name="isDefault" value="true" /><span>Use as my default address</span></label>{error ? <p className="account-error">{error}</p> : null}<button className="account-primary">Save address</button></form>
  </div>;
}

function Cards() {
  const [cards, setCards] = useState(null);
  const load = useCallback(() => request("/api/account/cards").then((body) => setCards(body.cards)), []);
  useEffect(() => { load(); }, [load]);
  return <div className="account-view"><h3>Saved cards</h3><p>Cards are stored securely by Square. Card numbers never touch this website.</p><div className="saved-list">{cards?.map((card) => <article key={card.id}><CreditCard /><div><strong>{card.brand} ending in {card.last4}</strong><p>Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}</p></div><button type="button" aria-label={`Remove card ending ${card.last4}`} title="Remove" onClick={async () => { await request(`/api/account/cards/${encodeURIComponent(card.id)}`, { method: "DELETE" }); load(); }}><Trash2 /></button></article>)}</div>{cards && !cards.length ? <p>No saved cards yet.</p> : null}<p className="account-notice">Choose “Save this card” during checkout to add one with your consent.</p></div>;
}

function Wholesale() {
  const [account, setAccount] = useState(undefined); const [error, setError] = useState(""); const [invoice, setInvoice] = useState(null); const [busy, setBusy] = useState(false);
  const load = useCallback(() => request("/api/house/account").then((body) => setAccount(body.account)).catch((cause) => setError(cause.message)), []);
  useEffect(() => { load(); }, [load]);
  const apply = async (event) => {
    event.preventDefault(); setError(""); const form = new FormData(event.currentTarget);
    try { await request("/api/house/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); await load(); } catch (cause) { setError(cause.message); }
  };
  if (account === undefined) return <div className="account-view"><p>Loading wholesale account…</p></div>;
  if (!account) return <div className="account-view wholesale-view"><p className="eyebrow">For organizations</p><h3>Apply for wholesale</h3><p>Schools, shuls, camps, caterers, event planners, and approved institutions can request invoice and account-credit terms.</p><form className="account-form" onSubmit={apply}><label><span>Organization name</span><input name="organizationName" required /></label><label><span>Organization type</span><select name="industry" required><option value="school">School</option><option value="shul">Shul</option><option value="catering">Caterer</option><option value="event_planner">Event planner</option><option value="camp">Camp</option><option value="institution">Institution</option><option value="other">Other</option></select></label><label><span>Billing email</span><input name="billingEmail" type="email" required /></label><label><span>Usual fulfillment</span><select name="defaultFulfillment"><option value="DELIVERY">Delivery</option><option value="PICKUP">Pickup</option></select></label><label><span>Order needs</span><textarea name="notes" rows="4" placeholder="Typical quantities, frequency, delivery area, or event needs" /></label>{error ? <p className="account-error">{error}</p> : null}<button className="account-primary">Submit application</button></form></div>;
  const credit = account.credit;
  const createInvoice = async () => {
    setBusy(true); setError("");
    try { const body = await request("/api/house/invoices", { method: "POST" }); setInvoice(body.invoice); await load(); }
    catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };
  return <div className="account-view wholesale-view"><p className="eyebrow">House account</p><h3>{account.organizationName}</h3><div className={`wholesale-status is-${account.status}`}>{account.status}</div>{account.status === "pending" ? <p className="account-notice">Amazing Donuts is reviewing this application. Ordering on account unlocks after approval and credit setup.</p> : null}<dl className="credit-grid"><div><dt>Balance</dt><dd>{money({ amount: credit.balance, currency: account.currency })}</dd></div><div><dt>Available credit</dt><dd>{money({ amount: credit.available, currency: account.currency })}</dd></div><div><dt>Credit limit</dt><dd>{money({ amount: credit.creditLimit, currency: account.currency })}</dd></div><div><dt>Terms</dt><dd>Net {account.paymentTermsDays}</dd></div></dl>{account.status === "active" && credit.balance > 0 ? <button className="account-primary" type="button" disabled={busy} onClick={createInvoice}><FileText /> {busy ? "Creating invoice…" : "Pay balance with Square"}</button> : null}{invoice?.publicUrl ? <p className="account-notice">Square emailed the invoice to the billing contact. <a href={invoice.publicUrl} target="_blank" rel="noreferrer">Open secure invoice</a></p> : null}{error ? <p className="account-error" role="alert">{error}</p> : null}<h4>Invoices</h4>{account.invoices?.length ? <div className="ledger-list">{account.invoices.map((item) => <a key={item.id} href={item.public_url} target="_blank" rel="noreferrer"><span>Due {dateOnly(item.due_at)}</span><strong>{item.status}</strong><b>{money({ amount: item.amount, currency: item.currency })}</b></a>)}</div> : <p>No invoices issued yet.</p>}<h4>Account activity</h4>{account.ledger.length ? <div className="ledger-list">{account.ledger.map((entry) => <div key={entry.id}><span>{new Date(entry.effective_at).toLocaleDateString("en-CA")}</span><strong>{entry.description}</strong><b>{money({ amount: entry.amount, currency: entry.currency })}</b></div>)}</div> : <p>No account activity yet.</p>}<h4>Statements</h4>{account.statements.length ? <div className="ledger-list">{account.statements.map((statement) => <a key={statement.id} href={`/api/house/statements/${statement.id}.pdf`} target="_blank" rel="noreferrer"><span>{dateOnly(statement.period_start)}–{dateOnly(statement.period_end)}</span><strong>{statement.status}</strong><b>{money({ amount: statement.amount_due, currency: statement.currency })} <Download /></b></a>)}</div> : <p>No statements issued yet.</p>}</div>;
}

function StaffAccounts() {
  const [accounts, setAccounts] = useState(null); const [message, setMessage] = useState("");
  const load = useCallback(() => request("/api/admin/house/accounts").then((body) => setAccounts(body.accounts)).catch((cause) => setMessage(cause.message)), []);
  useEffect(() => { load(); }, [load]);
  const update = async (event, account) => {
    event.preventDefault(); setMessage(""); const form = new FormData(event.currentTarget);
    try { await request(`/api/admin/house/accounts/${account.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: form.get("status"), creditLimitAmount: Math.round(Number(form.get("creditLimit")) * 100), paymentTermsDays: Number(form.get("terms")) }) }); setMessage(`${account.organization_name} updated.`); await load(); }
    catch (cause) { setMessage(cause.message); }
  };
  const statement = async (event, account) => {
    event.preventDefault(); setMessage(""); const form = new FormData(event.currentTarget);
    try { await request(`/api/admin/house/accounts/${account.id}/statements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ periodStart: form.get("periodStart"), periodEnd: form.get("periodEnd") }) }); setMessage(`Statement issued for ${account.organization_name}.`); }
    catch (cause) { setMessage(cause.message); }
  };
  return <div className="account-view staff-view"><p className="eyebrow">Staff</p><h3>Wholesale accounts</h3>{message ? <p className="account-notice" role="status">{message}</p> : null}{!accounts ? <p>Loading accounts…</p> : !accounts.length ? <p>No wholesale applications yet.</p> : accounts.map((account) => <article className="staff-account" key={account.id}><header><div><strong>{account.organization_name}</strong><span>{account.account_code} · {account.billing_email}</span></div><b>{account.status}</b></header><form onSubmit={(event) => update(event, account)}><label><span>Status</span><select name="status" defaultValue={account.status}><option value="active">Active</option><option value="suspended">Suspended</option><option value="closed">Closed</option></select></label><label><span>Credit limit</span><input name="creditLimit" type="number" min="0" step="0.01" defaultValue={Number(account.credit_limit_amount) / 100} /></label><label><span>Terms</span><select name="terms" defaultValue={account.payment_terms_days}><option value="0">Due now</option><option value="15">Net 15</option><option value="30">Net 30</option><option value="45">Net 45</option><option value="60">Net 60</option></select></label><button className="account-primary">Save</button></form><form className="statement-form" onSubmit={(event) => statement(event, account)}><label><span>Statement from</span><input type="date" name="periodStart" required /></label><label><span>Through</span><input type="date" name="periodEnd" required /></label><button type="submit"><FileText /> Issue statement</button></form></article>)}</div>;
}

export default function AccountDrawer({ open, onOpen, user, onUser, onReorder }) {
  const [mode, setMode] = useState("login");
  const [tab, setTab] = useState("orders");
  return <>{open ? <button className="account-scrim" type="button" onClick={() => onOpen(false)} aria-label="Close account" /> : null}<aside className={`account-drawer${open ? " is-open" : ""}`} aria-hidden={!open} aria-label="Customer account">
    <header><div><p>Your account</p><h2>{user ? `Hi, ${user.firstName}` : "Amazing regulars"}</h2></div><button type="button" onClick={() => onOpen(false)} aria-label="Close account" title="Close"><X /></button></header>
    {!user ? <AuthForm mode={mode} setMode={setMode} onUser={onUser} /> : <>
      <nav className="account-tabs" aria-label="Account pages"><button aria-selected={tab === "orders"} onClick={() => setTab("orders")}><Package />Orders</button><button aria-selected={tab === "addresses"} onClick={() => setTab("addresses")}><MapPin />Addresses</button><button aria-selected={tab === "cards"} onClick={() => setTab("cards")}><CreditCard />Cards</button><button aria-selected={tab === "wholesale"} onClick={() => setTab("wholesale")}><Building2 />Wholesale</button>{user.isAdmin ? <button aria-selected={tab === "staff"} onClick={() => setTab("staff")}><ShieldCheck />Staff</button> : null}</nav>
      {tab === "orders" ? <Orders onReorder={onReorder} /> : tab === "addresses" ? <Addresses /> : tab === "cards" ? <Cards /> : tab === "wholesale" ? <Wholesale /> : <StaffAccounts />}
      <button className="account-logout" type="button" onClick={async () => { await request("/api/auth/logout", { method: "POST" }); onUser(null); }}><LogOut /> Sign out</button>
    </>}
  </aside></>;
}

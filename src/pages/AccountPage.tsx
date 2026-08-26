import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Building2, CreditCard, LogOut, Package, ReceiptText, UserRound } from "lucide-react";
import AuthModal from "../shop/AuthModal";
import CommerceLogo from "./CommerceLogo";
import "../index.css";
import "../components/brand/brand.css";
import "../shop/shop.css";
import "./commerce.css";

const cash = (n: number, c = "CAD") => new Intl.NumberFormat("en-CA", { style: "currency", currency: c }).format(Number(n || 0) / 100);
const organizationRoles: Record<string, [string, string][]> = {
  School: [
    ["principal", "Principal"],
    ["office_manager", "Office manager"],
    ["teacher", "Teacher"],
    ["staff", "Staff"],
  ],
  Shul: [
    ["rabbi", "Rabbi"],
    ["president", "President"],
    ["administrator", "Administrator"],
    ["staff", "Staff"],
  ],
  Caterer: [
    ["owner", "Owner"],
    ["operations_manager", "Operations manager"],
    ["sales_coordinator", "Sales coordinator"],
    ["staff", "Staff"],
  ],
  "Event planner": [
    ["owner", "Owner"],
    ["lead_planner", "Lead planner"],
    ["coordinator", "Coordinator"],
    ["staff", "Staff"],
  ],
  "Corporate or office": [
    ["owner_executive", "Owner or executive"],
    ["office_manager", "Office manager"],
    ["department_manager", "Department manager"],
    ["employee", "Employee"],
  ],
  "Other business": [
    ["owner", "Owner"],
    ["manager", "Manager"],
    ["staff", "Staff"],
  ],
};
const day = (v: string) =>
  new Date(v).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
async function api(path: string, options?: RequestInit) {
  const response = await fetch(`/api/house${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Request failed.");
  return body;
}

type View = "orders" | "profile" | "house";
type SquareCard = {
  attach: (selector: string) => Promise<void>;
  tokenize: (details: unknown) => Promise<{
    status: string;
    token?: string;
    errors?: { message?: string }[];
  }>;
  destroy: () => Promise<boolean>;
};
declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => { card: () => Promise<SquareCard> };
    };
  }
}

export default function AccountPage() {
  const resetToken = new URLSearchParams(location.search).get("reset");
  const [session, setSession] = useState<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [creditAccount, setCreditAccount] = useState<any>();
  const [application, setApplication] = useState<any>();
  const [authOpen, setAuthOpen] = useState(false);
  const [view, setView] = useState<View>(new URLSearchParams(location.search).has("statement") ? "house" : "orders");
  const [message, setMessage] = useState("");
  const load = () =>
    api("/storefront/session")
      .then(async (next) => {
        setSession(next);
        if (next.user) {
          const [orderBody, applicationBody, creditBody] = await Promise.all([api("/storefront/orders"), api("/storefront/house-application"), next.houseAccount ? api("/portal/account") : Promise.resolve({ account: null })]);
          setOrders(orderBody.orders);
          setApplication(applicationBody.application);
          setCreditAccount(creditBody.account);
        } else setAuthOpen(true);
      })
      .catch((error) => setMessage(error.message));
  useEffect(() => {
    if (!resetToken) void load();
  }, [resetToken]);
  if (resetToken) return <PasswordReset token={resetToken} />;
  if (!session?.user)
    return (
      <main className="commerce-shell account-gate">
        <a href="/shop/">
          <ArrowLeft /> Back to shop
        </a>
        <section>
          <UserRound />
          <h1>Your Amazing Donuts account</h1>
          <p>Sign in to see orders, manage your details, and apply for house-account credit.</p>
          <button onClick={() => setAuthOpen(true)}>Sign in or create account</button>
        </section>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={load} />
      </main>
    );
  return (
    <main className="commerce-shell">
      <header className="commerce-top">
        <a href="/shop/">
          <ArrowLeft /> Shop
        </a>
        <CommerceLogo />
        <button
          onClick={async () => {
            await api("/auth/logout", { method: "POST" });
            location.assign("/shop/");
          }}
        >
          <LogOut /> Sign out
        </button>
      </header>
      <div className="account-layout">
        <aside className="account-nav">
          <div className="account-person">
            <span>
              {session.user.firstName[0]}
              {session.user.lastName[0]}
            </span>
            <strong>
              {session.user.firstName} {session.user.lastName}
            </strong>
            <small>{session.user.email}</small>
          </div>
          <button className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}>
            <Package /> Orders
          </button>
          <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}>
            <UserRound /> Profile
          </button>
          <button className={view === "house" ? "active" : ""} onClick={() => setView("house")}>
            <Building2 /> House account
          </button>
          {session.houseAccount && (
            <div className="house-credit">
              <Building2 />
              <strong>{session.houseAccount.organizationName}</strong>
              <span>{cash(session.houseAccount.credit.available)} available</span>
            </div>
          )}
        </aside>
        <section className="account-content">
          {view === "orders" ? (
            <Orders orders={orders} />
          ) : view === "profile" ? (
            <Profile
              session={session}
              onSaved={() => {
                setMessage("Profile updated.");
                void load();
              }}
            />
          ) : (
            <HouseAccount
              session={session}
              account={creditAccount}
              application={application}
              onApplied={(next) => {
                setApplication(next);
                setMessage("House-account application submitted.");
              }}
            />
          )}
          {message && <p className="account-message">{message}</p>}
        </section>
      </div>
    </main>
  );
}

function PasswordReset({token}:{token:string}){
  const [password,setPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  return <main className="commerce-shell account-gate"><a href="/shop/"><ArrowLeft/> Back to shop</a><section><UserRound/><h1>Choose a new password</h1><p>Your reset link can be used once and expires after one hour.</p><form className="password-reset-form" onSubmit={async event=>{event.preventDefault();setMessage("");if(password!==confirmPassword){setMessage("Passwords do not match.");return;}setBusy(true);try{await api("/auth/reset-password",{method:"POST",body:JSON.stringify({token,password})});location.assign("/account/");}catch(error:any){setMessage(error.message);}finally{setBusy(false);}}}><label><span>New password</span><input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)}/></label><label><span>Confirm password</span><input type="password" minLength={8} required autoComplete="new-password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)}/></label>{message&&<p role="alert">{message}</p>}<button disabled={busy}>{busy?"Updating...":"Update password"}</button></form></section></main>;
}

function Orders({ orders }: { orders: any[] }) {
  return (
    <>
      <div className="commerce-heading">
        <p>Order history</p>
        <h1>Your orders</h1>
      </div>
      {orders.length ? (
        <div className="customer-orders">
          {orders.map((order) => (
            <article key={order.id}>
              <header>
                <div>
                  <span>{day(order.ordered_at)}</span>
                  <strong>Order #{order.square_order_id.slice(-8)}</strong>
                </div>
                <em>{order.status}</em>
              </header>
              <div>
                {(order.line_items || []).map((line: any) => (
                  <p key={line.uid || line.name}>
                    <span>
                      {line.name} × {line.quantity}
                    </span>
                    <b>{cash(line.total_money?.amount, order.currency)}</b>
                  </p>
                ))}
              </div>
              <footer>
                <span>
                  {order.payment_method === "house_account" ? "Pay on account" : "Card"} · {order.fulfillment?.type}
                </span>
                <strong>{cash(order.total, order.currency)}</strong>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="no-orders">
          <ReceiptText />
          <h2>No orders yet</h2>
          <p>Your completed website orders will appear here.</p>
          <a href="/shop/">Start an order</a>
        </div>
      )}
    </>
  );
}

function Profile({ session, onSaved }: { session: any; onSaved: () => void }) {
  const profile = session.profile || {};
  return (
    <>
      <div className="commerce-heading">
        <p>Account details</p>
        <h1>Your profile</h1>
      </div>
      <form
        className="profile-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = Object.fromEntries(new FormData(event.currentTarget));
          await api("/storefront/profile", {
            method: "PATCH",
            body: JSON.stringify({
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone,
              address: {
                addressLine1: data.addressLine1,
                addressLine2: data.addressLine2,
                locality: data.locality,
                administrativeDistrictLevel1: "ON",
                postalCode: data.postalCode,
                country: "CA",
              },
            }),
          });
          onSaved();
        }}
      >
        <label>
          <span>First name</span>
          <input name="firstName" defaultValue={profile.first_name} required />
        </label>
        <label>
          <span>Last name</span>
          <input name="lastName" defaultValue={profile.last_name} required />
        </label>
        <label>
          <span>Email</span>
          <input value={profile.email} disabled />
        </label>
        <label>
          <span>Phone</span>
          <input name="phone" defaultValue={profile.default_phone || profile.phone || ""} />
        </label>
        <label>
          <span>Requested credit limit</span>
          <input name="requestedCreditLimit" type="number" min="0" step="100" required />
        </label>
        <label>
          <span>Expected order total</span>
          <input name="estimatedOrderTotal" type="number" min="0" step="25" required />
        </label>
        <label className="wide">
          <span>Street address</span>
          <input name="addressLine1" defaultValue={profile.default_address?.addressLine1 || ""} />
        </label>
        <label>
          <span>Unit</span>
          <input name="addressLine2" defaultValue={profile.default_address?.addressLine2 || ""} />
        </label>
        <label>
          <span>City</span>
          <input name="locality" defaultValue={profile.default_address?.locality || "Toronto"} />
        </label>
        <label>
          <span>Postal code</span>
          <input name="postalCode" defaultValue={profile.default_address?.postalCode || ""} />
        </label>
        <button>Save profile</button>
      </form>
    </>
  );
}

function HouseAccount({ session, account, application, onApplied }: { session: any; account: any; application: any; onApplied: (application: any) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (session.houseAccount)
    return (
      <>
        <div className="commerce-heading">
          <p>Business credit</p>
          <h1>Your house account</h1>
        </div>
        <div className="house-application-status">
          <Building2 />
          <h2>{session.houseAccount.organizationName}</h2>
          <p>
            Your account is {session.houseAccount.status}. You currently have <strong>{cash(session.houseAccount.credit.available)}</strong> available.
          </p>
          {session.houseAccount.card ? (
            <p>
              <CreditCard /> {session.houseAccount.card.brand || "Card"} ending in {session.houseAccount.card.last4} is on file.
            </p>
          ) : (
            <p>A card on file is required before credit purchases are enabled.</p>
          )}
        </div>
        {!session.houseAccount.card || new URLSearchParams(location.search).has("replace-card") ? <SaveHouseCard session={session} onSaved={() => location.reload()} /> : null}
        {session.houseAccount.role === "account_admin" ? <CustomerMemberManager session={session} account={account} /> : null}
        {account?.ledger?.length ? (
          <div className="customer-orders">
            <h2>Credit activity</h2>
            {account.ledger.map((entry: any) => (
              <article key={entry.id}>
                <header>
                  <div>
                    <span>{day(entry.effective_at)}</span>
                    <strong>{entry.description}</strong>
                  </div>
                  <em>{cash(entry.amount, entry.currency)}</em>
                </header>
              </article>
            ))}
          </div>
        ) : null}
        {account?.statements?.length ? (
          <div className="customer-orders">
            <h2>Statements</h2>
            {account.statements.map((statement: any) => (
              <article key={statement.id}>
                <header>
                  <div>
                    <span>{day(statement.period_end)}</span>
                    <strong>{statement.statement_number}</strong>
                  </div>
                  <em>{statement.status}</em>
                </header>
                <footer>
                  <span>{cash(statement.closing_balance, statement.currency)} balance</span>
                  <a href={`/api/house/statements/${statement.id}.pdf`} target="_blank" rel="noreferrer">
                    Download PDF
                  </a>
                  {!["paid", "void"].includes(statement.status) ? <PayStatement statement={statement} /> : null}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="no-orders">
            <ReceiptText />
            <h2>No statements yet</h2>
            <p>Statements issued by the bakery will appear here.</p>
          </div>
        )}
      </>
    );
  if (application)
    return (
      <>
        <div className="commerce-heading">
          <p>Business credit</p>
          <h1>House-account application</h1>
        </div>
        <div className={`house-application-status ${application.status}`}>
          <Building2 />
          <h2>{application.organization_name}</h2>
          <strong>{application.status}</strong>
          <p>{application.status === "pending" ? "The bakery is reviewing your application. You can continue ordering by card while it is under review." : application.status === "rejected" ? application.review_notes || "The application was not approved. Contact the bakery if your circumstances have changed." : "Your account has been approved. Refresh this page to access it."}</p>
          {application.status === "rejected" ? (
            <button type="button" onClick={() => onApplied(null)}>
              Correct details and apply again
            </button>
          ) : null}
        </div>
      </>
    );
  return (
    <>
      <div className="commerce-heading">
        <p>Business credit</p>
        <h1>Apply for a house account</h1>
      </div>
      <form
        className="house-application-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          const data = Object.fromEntries(new FormData(event.currentTarget));
          try {
            const body = await api("/storefront/house-application", {
              method: "POST",
              body: JSON.stringify(data),
            });
            onApplied(body.application);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Application failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          <span>Organization name</span>
          <input name="organizationName" autoComplete="organization" required />
        </label>
        <label>
          <span>Organization type</span>
          <select name="organizationType" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            <option>School</option>
            <option>Shul</option>
            <option>Caterer</option>
            <option>Event planner</option>
            <option>Corporate or office</option>
            <option>Other business</option>
          </select>
        </label>
        <label>
          <span>Phone</span>
          <input name="phone" type="tel" defaultValue={session.profile?.default_phone || session.profile?.phone || ""} />
        </label>
        <label className="wide">
          <span>About your ordering needs</span>
          <textarea name="notes" rows={5} maxLength={3000} placeholder="Typical order size, frequency, and billing contact details" />
        </label>
        {error && (
          <p className="checkout-error wide" role="alert">
            {error}
          </p>
        )}
        <button className="wide" disabled={busy}>
          {busy ? "Submitting..." : "Submit application"}
        </button>
      </form>
    </>
  );
}

function CustomerMemberManager({ session, account }: { session: any; account: any }) {
  const initialType = organizationRoles[session.houseAccount.organizationType] ? session.houseAccount.organizationType : "Other business";
  const [organizationType, setOrganizationType] = useState(initialType);
  const [message, setMessage] = useState("");
  return (
    <section className="house-application-status">
      <Building2 />
      <h2>Organization members</h2>
      <p>Add people who already have an Amazing Donuts website account.</p>
      <form
        className="house-application-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setMessage("");
          const data = new FormData(event.currentTarget);
          try {
            await api("/storefront/house-members", { method: "POST", body: JSON.stringify({ email: data.get("email"), organizationType, organizationRole: data.get("organizationRole"), role: data.get("role"), purchaseLimit: data.get("purchaseLimit") ? Math.round(Number(data.get("purchaseLimit")) * 100) : null }) });
            setMessage("Member added.");
            event.currentTarget.reset();
          } catch (cause) {
            setMessage(cause instanceof Error ? cause.message : "Member could not be added.");
          }
        }}
      >
        <label>
          <span>1. Organization type</span>
          <select value={organizationType} onChange={(event) => setOrganizationType(event.target.value)}>
            {Object.keys(organizationRoles).map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          <span>2. Member role</span>
          <select name="organizationRole">
            {organizationRoles[organizationType].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Member email</span>
          <input name="email" type="email" required />
        </label>
        <label>
          <span>Permissions</span>
          <select name="role">
            <option value="purchaser">Can purchase</option>
            <option value="account_admin">Account administrator</option>
            <option value="viewer">View only</option>
          </select>
        </label>
        <label>
          <span>Purchase limit</span>
          <input name="purchaseLimit" type="number" min="0" step="1" />
        </label>
        <button>Add member</button>
        {message ? <p className="wide">{message}</p> : null}
      </form>
      {account?.purchasers?.length ? (
        <div className="customer-orders">
          {account.purchasers.map((member: any) => (
            <article key={member.id}>
              <header>
                <div>
                  <strong>
                    {member.first_name} {member.last_name}
                  </strong>
                  <span>{member.email}</span>
                </div>
                <em>{String(member.organization_role).replace(/_/g, " ")}</em>
              </header>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SaveHouseCard({ session, onSaved }: { session: any; onSaved: () => void }) {
  const card = useRef<SquareCard | undefined>(undefined),
    [ready, setReady] = useState(false),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const mount = async () => {
      const config = await api("/storefront/config");
      if (!window.Square) {
        const script = document.createElement("script");
        script.src = config.environment === "sandbox" ? "https://sandbox.web.squarecdn.com/v1/square.js" : "https://web.squarecdn.com/v1/square.js";
        script.async = true;
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Secure card fields could not load."));
          document.head.appendChild(script);
        });
      }
      if (cancelled || !window.Square) return;
      card.current = await window.Square.payments(config.applicationId, config.locationId).card();
      await card.current.attach("#house-card-fields");
      setReady(true);
    };
    void mount().catch((cause) => setError(cause.message));
    return () => {
      cancelled = true;
      void card.current?.destroy().catch(() => {});
      card.current = undefined;
    };
  }, []);
  return (
    <form
      className="house-application-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          if (!card.current || !ready) throw new Error("The secure card form is still loading.");
          if (!consent) throw new Error("Consent is required to save this card.");
          const token = await card.current.tokenize({
            intent: "STORE",
            customerInitiated: true,
            sellerKeyedIn: false,
            billingContact: {
              givenName: session.user.firstName,
              familyName: session.user.lastName,
              email: session.user.email,
            },
          });
          if (token.status !== "OK" || !token.token) throw new Error(token.errors?.[0]?.message || "Card authorization failed.");
          await api("/storefront/house-card", {
            method: "POST",
            body: JSON.stringify({
              sourceId: token.token,
              consent: true,
              cardholderName: `${session.user.firstName} ${session.user.lastName}`,
              replace: new URLSearchParams(location.search).has("replace-card"),
            }),
          });
          onSaved();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Card could not be saved.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="wide">
        <h2>Add a card on file</h2>
        <p>This card secures the credit account and may be charged for statement balances.</p>
        <div id="house-card-fields" className="square-card" />
      </div>
      <label className="wide no-contact">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>I authorize Amazing Donuts to save this card and charge outstanding statements when due.</span>
      </label>
      {error ? <p className="checkout-error wide">{error}</p> : null}
      <button className="wide" disabled={!ready || !consent || busy}>
        {busy ? "Saving card..." : "Save card and enable credit"}
      </button>
    </form>
  );
}

function PayStatement({ statement }: { statement: any }) {
  const card = useRef<SquareCard | undefined>(undefined);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [paid, setPaid] = useState(false);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const mount = async () => {
      const config = await api("/storefront/config");
      if (!window.Square) {
        const script = document.createElement("script");
        script.src = config.environment === "sandbox" ? "https://sandbox.web.squarecdn.com/v1/square.js" : "https://web.squarecdn.com/v1/square.js";
        script.async = true;
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Secure card fields could not load."));
          document.head.appendChild(script);
        });
      }
      if (cancelled || !window.Square) return;
      card.current = await window.Square.payments(config.applicationId, config.locationId).card();
      await card.current.attach(`#statement-card-${statement.id}`);
    };
    void mount().catch((cause) => setError(cause.message));
    return () => {
      cancelled = true;
      void card.current?.destroy().catch(() => {});
      card.current = undefined;
    };
  }, [open, statement.id]);
  if (paid) return <strong>Paid</strong>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)}>
        <CreditCard /> Pay now
      </button>
    );
  return (
    <div className="statement-payment">
      <div id={`statement-card-${statement.id}`} className="square-card" />
      {error ? <p className="checkout-error">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            if (!card.current) throw new Error("The secure card form is still loading.");
            const token = await card.current.tokenize({
              amount: (Number(statement.closing_balance) / 100).toFixed(2),
              currencyCode: statement.currency,
              intent: "CHARGE",
              customerInitiated: true,
              sellerKeyedIn: false,
            });
            if (token.status !== "OK" || !token.token) throw new Error(token.errors?.[0]?.message || "Card authorization failed.");
            await api(`/storefront/statements/${statement.id}/pay`, {
              method: "POST",
              body: JSON.stringify({
                sourceId: token.token,
                idempotencyKey: crypto.randomUUID(),
              }),
            });
            setPaid(true);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Payment failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Processing..." : `Pay ${cash(statement.closing_balance, statement.currency)}`}
      </button>
    </div>
  );
}

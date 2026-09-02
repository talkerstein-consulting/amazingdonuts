import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { ArrowLeft, Building2, CreditCard, Download, Eye, EyeOff, Heart, LogOut, Package, ReceiptText, UserRound, X } from "lucide-react";
import { PRODUCTS } from "../data/products";
import AuthModal from "../shop/AuthModal";
import CommerceLogo from "./CommerceLogo";
import "../index.css";
import "../components/brand/brand.css";
import "../shop/shop.css";
import "./commerce.css";
import AddressAutocomplete, { type Address, type SavedAddress } from "../components/AddressAutocomplete";
import { formatNorthAmericanPhone } from "../lib/phone";

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
const day = (value: unknown) => {
  if (!value) return "Date unavailable";
  const raw = String(value);
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
const statementOrders = (orders: any[] = [], statement: any) => {
  const start = new Date(statement.period_start).getTime();
  const endExclusive = new Date(statement.period_end).getTime() + 24 * 60 * 60 * 1000;
  return orders.filter((order: any) => {
    const orderedAt = new Date(order.ordered_at).getTime();
    return order.payment_method === "house_account" && orderedAt >= start && orderedAt < endExclusive;
  });
};
const cardErrorMessage = (message?: string) => {
  if (!message) return "Card authorization failed. Please check the card details and try again.";
  if (/verificationDetails|billingContact|must be a\(n\) object/i.test(message)) {
    return "We couldn't verify the billing details for this card. Please check the card details and try again.";
  }
  return message;
};
function PinField({name,value,onChange,placeholder,required=false}:{name?:string;value?:string;onChange?:(value:string)=>void;placeholder?:string;required?:boolean}){
  const [visible,setVisible]=useState(false);
  return <div className="pin-field"><input name={name} type={visible?"text":"password"} inputMode="numeric" pattern="[0-9]{4,8}" minLength={4} maxLength={8} value={value} onChange={onChange?event=>onChange(event.target.value):undefined} placeholder={placeholder} autoComplete="new-password" required={required}/><button type="button" onClick={()=>setVisible(current=>!current)} aria-label={visible?"Hide PIN":"Show PIN"}>{visible?<EyeOff/>:<Eye/>}</button></div>;
}
const MoneyField=({name,...props}:{name:string}&InputHTMLAttributes<HTMLInputElement>)=><div className="storefront-money-input"><span aria-hidden="true">$</span><input name={name} type="number" {...props}/></div>;
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

type View = "orders" | "wishlist" | "profile" | "house";
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
  const statementToken = new URLSearchParams(location.search).get("statement");
  const [session, setSession] = useState<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [creditAccount, setCreditAccount] = useState<any>();
  const [application, setApplication] = useState<any>();
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [view, setView] = useState<View>(new URLSearchParams(location.search).has("statement") ? "house" : "orders");
  const [message, setMessage] = useState("");
  const load = () =>
    api("/storefront/session")
      .then(async (next) => {
        setSession(next);
        if (next.user) {
          const [orderBody, applicationBody, creditBody, wishlistBody] = await Promise.all([api("/storefront/orders"), api("/storefront/house-application"), next.houseAccount ? api("/portal/account") : Promise.resolve({ account: null }), api("/storefront/wishlist")]);
          setOrders(orderBody.orders);
          setApplication(applicationBody.application);
          setCreditAccount(creditBody.account);
          setWishlist(wishlistBody.productIds || []);
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
          <p>Sign in to see orders, manage your details, and apply for institutional credit.</p>
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
          <button className={view === "wishlist" ? "active" : ""} onClick={() => setView("wishlist")}>
            <Heart /> Wishlist
          </button>
          <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}>
            <UserRound /> Profile
          </button>
          <button className={view === "house" ? "active" : ""} onClick={() => setView("house")}>
            <Building2 /> Institutional account
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
          ) : view === "wishlist" ? (
            <Wishlist productIds={wishlist} onRemoved={(id) => setWishlist((current) => current.filter((item) => item !== id))} />
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
              statementToken={statementToken}
              onStatementPaid={() => {
                const url=new URL(location.href);
                url.searchParams.delete("statement");
                history.replaceState({},"",`${url.pathname}${url.search}${url.hash}`);
                void load();
              }}
              onApplied={(next) => {
                setApplication(next);
                setMessage("Institutional account application submitted.");
              }}
            />
          )}
          {message && <p className="account-message">{message}</p>}
        </section>
      </div>
    </main>
  );
}

function Wishlist({productIds,onRemoved}:{productIds:string[];onRemoved:(id:string)=>void}) {
  const products=productIds.flatMap(id=>{const product=PRODUCTS.find(item=>item.id===id);return product?[product]:[]});
  return <><div className="commerce-heading"><p>Saved for later</p><h1>Your wishlist</h1></div>{products.length?<div className="wishlist-grid">{products.map(product=><article key={product.id}><a href={`/shop/#product/${product.id}`}><img src={product.img} alt=""/><span><strong>{product.name}</strong><small>{product.price}</small></span></a><button type="button" onClick={async()=>{await api(`/storefront/wishlist/${product.id}`,{method:"DELETE"});onRemoved(product.id);}} aria-label={`Remove ${product.name} from wishlist`}><Heart fill="currentColor"/></button></article>)}</div>:<div className="no-orders"><Heart/><h2>No saved favourites yet</h2><p>Tap the heart on any product to keep it here.</p><a href="/shop/">Browse products</a></div>}</>;
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
  const blank:Address={addressLine1:"",addressLine2:"",locality:"Toronto",administrativeDistrictLevel1:"ON",postalCode:"",country:"CA"};
  const [address,setAddress]=useState<Address>({...blank,...(profile.default_address||{})});
  const [addresses,setAddresses]=useState<SavedAddress[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [label,setLabel]=useState("Home");
  const [addressType,setAddressType]=useState<'home'|'work'|'other'>('home');
  const [isDefault,setIsDefault]=useState(true);
  const [placesEnabled,setPlacesEnabled]=useState(false);
  const [message,setMessage]=useState("");
  const [deleteOpen,setDeleteOpen]=useState(false),[deleteConfirmation,setDeleteConfirmation]=useState(""),[deleteError,setDeleteError]=useState(""),[deleting,setDeleting]=useState(false);
  const loadAddresses=()=>api('/storefront/addresses').then(body=>setAddresses(body.addresses||[]));
  useEffect(()=>{void loadAddresses();void api('/storefront/config').then(body=>setPlacesEnabled(Boolean(body.placesEnabled)))},[]);
  const selectAddress=(item:SavedAddress)=>{setSelectedId(item.id);setAddress({addressLine1:item.addressLine1,addressLine2:item.addressLine2,locality:item.locality,administrativeDistrictLevel1:item.administrativeDistrictLevel1,postalCode:item.postalCode,country:item.country});setLabel(item.label);setAddressType(item.addressType);setIsDefault(item.isDefault);setMessage("");};
  const resetAddress=()=>{setSelectedId(null);setAddress(blank);setLabel("Other");setAddressType('other');setIsDefault(addresses.length===0);setMessage("");};
  return (
    <>
      <div className="commerce-heading">
        <p>Account details</p>
        <h1>Your profile</h1>
      </div>
      {addresses.length>0&&<div className="saved-addresses" aria-label="Saved addresses">{addresses.map(item=><button type="button" className={selectedId===item.id?'active':''} key={item.id} onClick={()=>selectAddress(item)}><strong>{item.label}</strong><span>{item.addressLine1}{item.addressLine2?`, ${item.addressLine2}`:''}</span><small>{item.locality} {item.postalCode}{item.isDefault?' · Default':''}</small></button>)}<button type="button" className="saved-addresses__add" onClick={resetAddress}>+ Add another</button></div>}
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
                ...address,
              },
            }),
          });
          if(address.addressLine1&&address.postalCode){await api(selectedId?`/storefront/addresses/${selectedId}`:'/storefront/addresses',{method:selectedId?'PATCH':'POST',body:JSON.stringify({...address,label,addressType,isDefault})});await loadAddresses();}
          setMessage("Profile and address saved.");onSaved();
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
          <input name="phone" type="tel" defaultValue={formatNorthAmericanPhone(profile.default_phone || profile.phone || "")} onInput={event=>event.currentTarget.value=formatNorthAmericanPhone(event.currentTarget.value)} autoComplete="tel" />
        </label>
        <label className="wide">
          <span>Street address</span>
          <AddressAutocomplete address={address} onChange={setAddress} enabled={placesEnabled}/>
        </label>
        <label>
          <span>Unit</span>
          <input value={address.addressLine2} onChange={event=>setAddress({...address,addressLine2:event.target.value})} autoComplete="address-line2" />
        </label>
        <label>
          <span>City</span>
          <input value={address.locality} onChange={event=>setAddress({...address,locality:event.target.value})} autoComplete="address-level2" />
        </label>
        <label>
          <span>Postal code</span>
          <input value={address.postalCode} onChange={event=>setAddress({...address,postalCode:event.target.value.toUpperCase()})} autoComplete="postal-code" />
        </label>
        <label><span>Address label</span><input value={label} onChange={event=>setLabel(event.target.value)} placeholder="Home, Work, Studio..." required={Boolean(address.addressLine1)}/></label>
        <label><span>Address type</span><select value={addressType} onChange={event=>setAddressType(event.target.value as typeof addressType)}><option value="home">Home</option><option value="work">Work</option><option value="other">Other</option></select></label>
        <label className="profile-default"><input type="checkbox" checked={isDefault} onChange={event=>setIsDefault(event.target.checked)}/><span>Use as my default address</span></label>
        {selectedId&&<button className="profile-delete" type="button" onClick={async()=>{await api(`/storefront/addresses/${selectedId}`,{method:'DELETE'});resetAddress();await loadAddresses();}}>Delete address</button>}
        {message&&<p className="profile-message" role="status">{message}</p>}
        <button>Save profile</button>
      </form>
      <section className="delete-account">
        <div><p>Account access</p><h3>Delete account</h3><span>Permanently remove your login, Square customer profile, saved addresses, and wishlist. Completed transaction records are retained in anonymized form.</span></div>
        {!deleteOpen?<button type="button" onClick={()=>setDeleteOpen(true)}>Delete account</button>:<div className="delete-account__confirm"><label><span>Type DELETE to confirm</span><input value={deleteConfirmation} onChange={event=>setDeleteConfirmation(event.target.value)} autoComplete="off"/></label>{deleteError&&<p role="alert">{deleteError}</p>}<div><button type="button" onClick={()=>{setDeleteOpen(false);setDeleteConfirmation("");setDeleteError("");}}>Cancel</button><button type="button" disabled={deleteConfirmation!=="DELETE"||deleting} onClick={async()=>{setDeleting(true);setDeleteError("");try{await api('/storefront/account',{method:'DELETE',body:JSON.stringify({confirmation:deleteConfirmation})});location.assign('/shop/');}catch(cause){setDeleteError(cause instanceof Error?cause.message:'Account could not be deleted.');setDeleting(false);}}}>{deleting?'Deleting...':'Permanently delete'}</button></div></div>}
      </section>
    </>
  );
}

function HouseAccount({ session, account, application, statementToken, onStatementPaid, onApplied }: { session: any; account: any; application: any; statementToken: string | null; onStatementPaid: () => void; onApplied: (application: any) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [purchasers, setPurchasers] = useState([{ name: "", email: "", organizationRole: "Purchaser", pin: "" }]);
  const blankAddress:Address={addressLine1:"",addressLine2:"",locality:"Toronto",administrativeDistrictLevel1:"ON",postalCode:"",country:"CA"};
  const [organizationAddress,setOrganizationAddress]=useState<Address>({...blankAddress,...(session.profile?.default_address||{})});
  const [placesEnabled,setPlacesEnabled]=useState(false);
  useEffect(()=>{void api('/storefront/config').then(body=>setPlacesEnabled(Boolean(body.placesEnabled)))},[]);
  const linkedStatement=statementToken&&account?.statements?.find((statement:any)=>statement.payment_token===statementToken);
  const actionableStatuses=["overdue","partially_paid","issued"];
  const outstandingStatement=[...(account?.statements||[])]
    .filter((statement:any)=>["overdue","partially_paid","issued"].includes(statement.status)&&Number(statement.balance_due??statement.closing_balance)>0)
    .sort((left:any,right:any)=>{
      const priority:Record<string,number>={overdue:0,partially_paid:1,issued:2};
      return priority[left.status]-priority[right.status]||new Date(left.due_at||left.period_end).getTime()-new Date(right.due_at||right.period_end).getTime();
    })[0];
  const featuredStatement=(linkedStatement&&actionableStatuses.includes(linkedStatement.status)?linkedStatement:null)||outstandingStatement||linkedStatement;
  if (session.houseAccount)
    return (
      <>
        <div className="commerce-heading">
          <p>Business credit</p>
          <h1>Your institutional account</h1>
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
        {featuredStatement?<StatementPaymentPanel statement={{...featuredStatement,orders:(account?.orders||[]).filter((order:any)=>order.payment_method==="house_account"&&Number(order.balance_due)>0)}} session={session} onPaid={onStatementPaid}/>:null}
        {statementToken&&account&&!linkedStatement?<div className="statement-link-error" role="alert"><ReceiptText/><div><strong>We could not match this payment link</strong><span>The invoice may belong to another institutional account or the link may no longer be valid.</span></div></div>:null}
        {session.houseAccount.role === "account_admin" && account ? <OrganizationSettings account={account} /> : null}
        {!session.houseAccount.card || new URLSearchParams(location.search).has("replace-card") ? <SaveHouseCard session={session} onSaved={() => location.reload()} /> : null}
        <CustomerMemberManager session={session} account={account} onChanged={onStatementPaid} />
        {account?.orders?.some((order:any)=>order.payment_method==="house_account"&&Number(order.balance_due)>0)?<div className="customer-orders"><h2>Outstanding credit orders</h2><div className="account-table-scroll"><table className="account-data-table outstanding-order-table"><thead><tr><th>Date</th><th>Order</th><th>Channel</th><th className="money-column">Balance</th><th className="action-column">Payment</th></tr></thead><tbody>{account.orders.filter((order:any)=>order.payment_method==="house_account"&&Number(order.balance_due)>0).map((order:any)=><tr key={order.id}><td>{day(order.ordered_at)}</td><td><strong>{order.receipt_number||String(order.square_order_id).slice(-8)}</strong></td><td>{order.source==="pos"?"In store":"Online"}</td><td className="money-column">{cash(order.balance_due,order.currency)}</td><td className="action-column"><PayOrder order={order} session={session} onPaid={onStatementPaid}/></td></tr>)}</tbody></table></div></div>:null}
        {account?.ledger?.length ? (
          <div className="customer-orders">
            <h2>Credit activity</h2>
            <div className="account-table-scroll"><table className="account-data-table activity-data-table"><thead><tr><th>Date</th><th>Order details</th><th className="money-column">Amount</th></tr></thead><tbody>{account.ledger.map((entry: any) => <tr key={entry.id}><td>{day(entry.effective_at)}</td><td><strong>{entry.description}</strong></td><td className="money-column">{cash(entry.amount, entry.currency)}</td></tr>)}</tbody></table></div>
          </div>
        ) : null}
        {account?.statements?.length ? (
          <div className="customer-orders">
            <h2>Statements</h2>
            <div className="account-table-scroll"><table className="account-data-table statement-data-table"><thead><tr><th>Period</th><th>Statement</th><th>Status</th><th className="money-column">Balance</th><th className="action-column">Download</th><th className="action-column">Payment</th></tr></thead><tbody>{account.statements.map((statement: any) => {const payable={...statement,orders:statementOrders(account.orders,statement)};return <tr key={statement.id}><td>{day(statement.period_end)}</td><td><strong>{statement.statement_number}</strong></td><td><span className={`statement-status statement-status--${statement.status}`}>{statement.status}</span></td><td className="money-column">{cash(statement.balance_due??statement.closing_balance, statement.currency)}</td><td className="action-column"><a className="table-icon-action" href={`/api/house/statements/${statement.id}.pdf`} target="_blank" rel="noreferrer" aria-label={`Download ${statement.statement_number}`} title="Download PDF"><Download/></a></td><td className="action-column">{!["paid", "void"].includes(statement.status)&&statement.id!==featuredStatement?.id ? <PayStatement statement={payable} session={session} /> : <span className="table-action-empty">—</span>}</td></tr>})}</tbody></table></div>
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
          <h1>Institutional account application</h1>
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
        <h1>Apply for an institutional account</h1>
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
              body: JSON.stringify({ ...data, address:organizationAddress, authorizedPurchasers: purchasers.filter((person) => person.name.trim() && person.email.trim()) }),
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
          <input name="phone" type="tel" defaultValue={formatNorthAmericanPhone(session.profile?.default_phone || session.profile?.phone || "")} onInput={event=>event.currentTarget.value=formatNorthAmericanPhone(event.currentTarget.value)} autoComplete="tel" />
        </label>
        <label>
          <span>Requested credit limit</span>
          <MoneyField name="requestedCreditLimit" min="0" step="100" required />
        </label>
        <label>
          <span>Typical order total</span>
          <MoneyField name="estimatedOrderTotal" min="0" step="25" defaultValue="0" required />
        </label>
        <label>
          <span>Billing frequency</span>
          <select name="billingFrequency" defaultValue="monthly" required><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
        </label>
        <label>
          <span>Invoice email</span>
          <input name="invoiceEmail" type="email" defaultValue={session.user.email} required />
        </label>
        <label>
          <span>Organization authorization PIN</span>
          <PinField name="organizationPin" required />
        </label>
        <label className="wide">
          <span>Organization address</span>
          <AddressAutocomplete address={organizationAddress} onChange={setOrganizationAddress} enabled={placesEnabled} required />
        </label>
        <label>
          <span>Unit</span>
          <input value={organizationAddress.addressLine2} onChange={event=>setOrganizationAddress({...organizationAddress,addressLine2:event.target.value})} autoComplete="address-line2" />
        </label>
        <label>
          <span>City</span>
          <input value={organizationAddress.locality} onChange={event=>setOrganizationAddress({...organizationAddress,locality:event.target.value})} autoComplete="address-level2" required />
        </label>
        <label>
          <span>Province</span>
          <input value={organizationAddress.administrativeDistrictLevel1} onChange={event=>setOrganizationAddress({...organizationAddress,administrativeDistrictLevel1:event.target.value.toUpperCase()})} autoComplete="address-level1" required />
        </label>
        <label>
          <span>Postal code</span>
          <input value={organizationAddress.postalCode} onChange={event=>setOrganizationAddress({...organizationAddress,postalCode:event.target.value.toUpperCase()})} autoComplete="postal-code" required />
        </label>
        <fieldset className="wide authorized-purchasers"><legend>Additional authorized purchasers</legend><p>The applicant is automatically the account administrator. Give each additional purchaser their own 4 to 8 digit PIN.</p>{purchasers.map((person, index) => <div className="authorized-purchaser-row" key={index}><label><span>Name</span><input value={person.name} onChange={(event) => setPurchasers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name:event.target.value } : item))}/></label><label><span>Email</span><input type="email" value={person.email} onChange={(event) => setPurchasers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, email:event.target.value } : item))}/></label><label><span>Role</span><input value={person.organizationRole} onChange={(event) => setPurchasers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, organizationRole:event.target.value } : item))}/></label><label><span>Personal PIN</span><PinField value={person.pin} onChange={pin=>setPurchasers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, pin } : item))} required/></label>{purchasers.length > 1 ? <button type="button" onClick={() => setPurchasers((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button> : null}</div>)}<button type="button" onClick={() => setPurchasers((current) => [...current,{ name:"",email:"",organizationRole:"Purchaser",pin:"" }])}>Add another purchaser</button></fieldset>
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

function OrganizationSettings({account}:{account:any}){
  const [message,setMessage]=useState(""),address=account.metadata?.address||{};
  return <section className="organization-settings"><div className="section-heading"><p>Organization profile</p><h2>Account details</h2><span>Keep invoice, contact, and authorization details current.</span></div><form className="house-application-form" onSubmit={async event=>{event.preventDefault();setMessage("");const data=new FormData(event.currentTarget);try{await api("/storefront/house-settings",{method:"PATCH",body:JSON.stringify({organizationName:data.get("organizationName"),organizationType:data.get("organizationType"),billingContact:data.get("billingContact"),billingEmail:data.get("billingEmail"),phone:data.get("phone"),organizationPin:data.get("organizationPin"),address:{addressLine1:data.get("addressLine1"),addressLine2:data.get("addressLine2"),locality:data.get("locality"),administrativeDistrictLevel1:data.get("province"),postalCode:data.get("postalCode"),country:"CA"}})});setMessage("Organization details updated.");}catch(cause){setMessage(cause instanceof Error?cause.message:"Details could not be updated.");}}}>
    <label><span>Organization name</span><input name="organizationName" defaultValue={account.organization_name} required/></label>
    <label><span>Organization type</span><select name="organizationType" defaultValue={account.metadata?.organizationType||"Other business"}>{Object.keys(organizationRoles).map(type=><option key={type}>{type}</option>)}</select></label>
    <label><span>Billing contact</span><input name="billingContact" defaultValue={account.billing_contact} required/></label>
    <label><span>Invoice email</span><input name="billingEmail" type="email" defaultValue={account.billing_email} required/></label>
    <label><span>Phone</span><input name="phone" type="tel" defaultValue={formatNorthAmericanPhone(account.metadata?.phone||"")} onInput={event=>event.currentTarget.value=formatNorthAmericanPhone(event.currentTarget.value)} autoComplete="tel"/></label>
    <label><span>Reset organization PIN <small>Optional</small></span><PinField name="organizationPin" placeholder="Leave unchanged"/></label>
    <label className="wide"><span>Street address</span><input name="addressLine1" defaultValue={address.addressLine1||""} autoComplete="street-address"/></label>
    <label><span>Unit</span><input name="addressLine2" defaultValue={address.addressLine2||""} autoComplete="address-line2"/></label>
    <label><span>City</span><input name="locality" defaultValue={address.locality||"Toronto"} autoComplete="address-level2"/></label>
    <label><span>Province</span><input name="province" defaultValue={address.administrativeDistrictLevel1||"ON"} autoComplete="address-level1"/></label>
    <label><span>Postal code</span><input name="postalCode" defaultValue={address.postalCode||""} autoComplete="postal-code"/></label>
    {message?<p className="profile-message wide" role="status">{message}</p>:null}<button className="wide">Save account details</button>
  </form></section>;
}

function CustomerMemberManager({ session, account, onChanged }: { session: any; account: any; onChanged:()=>void }) {
  const initialType = organizationRoles[session.houseAccount.organizationType] ? session.houseAccount.organizationType : "Other business";
  const [organizationType, setOrganizationType] = useState(initialType);
  const [message, setMessage] = useState("");
  const [editingId,setEditingId]=useState<string|null>(null);
  const [increaseOpen,setIncreaseOpen]=useState(false);
  const availableCredit=Number(account?.credit?.available||0);
  const canManage=session.houseAccount.role==="account_admin";
  return (
    <section className="house-application-status">
      <Building2 />
      <h2>Organization members</h2>
      <p>{canManage?"Add people who already have an Amazing Donuts website account. ":"Everyone authorized to use this institutional account is listed below. "}Every member draws from the same {cash(availableCredit)} currently available to the organization.</p>
      {canManage?<form
        className="house-application-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setMessage("");
          const data = new FormData(event.currentTarget);
          try {
            await api("/storefront/house-members", { method: "POST", body: JSON.stringify({ email: data.get("email"), organizationType, organizationRole: data.get("organizationRole"), role: data.get("role"), purchaseLimit: data.get("purchaseLimit") ? Math.round(Number(data.get("purchaseLimit")) * 100) : null, pin:data.get("pin") }) });
            setMessage("Member added.");
            event.currentTarget.reset();
            onChanged();
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
          <MoneyField name="purchaseLimit" min="0" max={(availableCredit/100).toFixed(2)} step="1" />
          <small>Optional personal cap. Maximum {cash(availableCredit)}; blank means up to the account's available credit.</small>
        </label>
        <label>
          <span>Personal authorization PIN</span>
          <PinField name="pin" required />
        </label>
        <button>Add member</button>
        {message ? <p className="wide">{message}</p> : null}
      </form>:null}
      {account?.purchasers?.length ? (
        <div className="customer-orders organization-member-list">
          {account.purchasers.map((member: any) => {
            const isCurrent=member.id===session.user.id||String(member.email).toLowerCase()===String(session.user.email).toLowerCase();
            const isAdmin=member.role==="account_admin";
            return <article key={member.id} className={`${isAdmin?'organization-member--admin ':''}${isCurrent?'organization-member--current':''}`.trim()}>
              <header>
                <div>
                  <strong>
                    {member.display_name || `${member.first_name} ${member.last_name}`}
                  </strong>
                  <span>{member.email}</span>
                </div>
                <div className="organization-member-badges">
                  {isAdmin?<span>Account admin</span>:null}
                  {isCurrent?<strong>You</strong>:null}
                </div>
              </header>
              {canManage&&editingId===member.id?<form className="member-edit-form" onSubmit={async event=>{event.preventDefault();setMessage("");const data=new FormData(event.currentTarget);try{await api(`/storefront/house-members/${member.id}`,{method:"PATCH",body:JSON.stringify({organizationRole:data.get("organizationRole"),role:data.get("role"),purchaseLimit:data.get("purchaseLimit")?Math.round(Number(data.get("purchaseLimit"))*100):null,status:data.get("status"),pin:data.get("pin")})});setEditingId(null);setMessage("Member updated.");onChanged();}catch(cause){setMessage(cause instanceof Error?cause.message:"Member could not be updated.");}}}>
                <label><span>Member role</span><select name="organizationRole" defaultValue={member.organization_role}>{organizationRoles[organizationType].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
                <label><span>Permissions</span><select name="role" defaultValue={member.role}><option value="purchaser">Can purchase</option><option value="account_admin">Account administrator</option><option value="viewer">View only</option></select></label>
                <label><span>Purchase limit</span><MoneyField name="purchaseLimit" min="0" max={(availableCredit/100).toFixed(2)} step="1" defaultValue={member.purchase_limit==null?"":Number(member.purchase_limit)/100}/><small>Maximum {cash(availableCredit)} currently available account-wide.</small></label>
                <label><span>Reset PIN <small>Optional</small></span><PinField name="pin" placeholder="Leave unchanged"/></label>
                <label><span>Status</span><select name="status" defaultValue={member.status}><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
                <div className="member-edit-actions"><button type="button" onClick={()=>setEditingId(null)}>Cancel</button><button>Save member</button></div>
              </form>:<footer><span>{member.role==="account_admin"?"Account administrator":member.role==="viewer"?"View only":"Can purchase"}{member.purchase_limit!=null?` · ${cash(member.purchase_limit)} personal cap`:" · Up to account availability"}</span>{canManage?<button type="button" onClick={()=>setEditingId(member.id)}>Edit member</button>:null}</footer>}
            </article>;
          })}
        </div>
      ) : null}
      {canManage?<div className="credit-increase-request">
        <div><strong>Need more organization credit?</strong><span>Increasing the approved account limit requires a separate review.</span></div>
        {!increaseOpen?<button type="button" onClick={()=>setIncreaseOpen(true)}>Request more credit</button>:<form onSubmit={async event=>{event.preventDefault();setMessage("");const data=new FormData(event.currentTarget);try{await api("/storefront/credit-increase-requests",{method:"POST",body:JSON.stringify({requestedCreditLimit:Math.round(Number(data.get("requestedCreditLimit"))*100),reason:data.get("reason")})});setMessage("Credit increase request submitted for review.");setIncreaseOpen(false);}catch(cause){setMessage(cause instanceof Error?cause.message:"Request could not be submitted.");}}}><label><span>Requested total credit limit</span><MoneyField name="requestedCreditLimit" min={(Number(account.credit.creditLimit)/100+.01).toFixed(2)} step="1" required/></label><label><span>Reason for increase</span><textarea name="reason" minLength={10} maxLength={2000} required/></label><div className="member-edit-actions"><button type="button" onClick={()=>setIncreaseOpen(false)}>Cancel</button><button>Submit request</button></div></form>}
      </div>:null}
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
      className="house-card-form"
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
      <div>
        <h2>Add a card on file</h2>
        <p>This card secures the credit account and may be charged for statement balances.</p>
        <div id="house-card-fields" className="square-card" />
      </div>
      <label className="house-card-consent">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>I authorize Amazing Donuts to save this card and charge outstanding statements when due.</span>
      </label>
      {error ? <p className="checkout-error">{error}</p> : null}
      <button disabled={!ready || !consent || busy}>
        {busy ? "Saving card..." : "Save card and enable credit"}
      </button>
    </form>
  );
}

function StatementPaymentPanel({statement,session,onPaid}:{statement:any;session:any;onPaid:()=>void}){
  const settled=['paid','void'].includes(statement.status);
  const statusDetail=statement.status==='paid'?`Paid on ${day(statement.paid_at)}`:statement.status==='void'?'Invoice voided':statement.status==='partially_paid'?`${cash(statement.balance_due,statement.currency)} remaining · Due ${day(statement.due_at)}`:`Due ${day(statement.due_at)}`;
  return <section className="statement-payment-panel" aria-labelledby="statement-payment-title"><header><div><span>{settled?'Invoice receipt':'Invoice payment'}</span><h2 id="statement-payment-title">{settled?'Invoice':'Pay'} {statement.statement_number}</h2><p>{statement.organization_name||'Institutional account'} · {statusDetail}</p></div><strong>{cash(statement.balance_due??statement.closing_balance,statement.currency)}</strong></header><div className="statement-payment-summary"><div><span>Statement period</span><b>{day(statement.period_start)} – {day(statement.period_end)}</b></div><div><span>Status</span><b>{statusDetail}</b></div><a href={`/api/house/statements/${statement.id}.pdf`} target="_blank" rel="noreferrer"><ReceiptText/> Download invoice</a></div>{settled?<div className="statement-payment-success"><CreditCard/><div><strong>{statement.status==='paid'?'Payment received':'No payment required'}</strong><span>{statement.status==='paid'?'This invoice has been paid.':'This invoice has been voided.'}</span></div></div>:<PayStatement statement={statement} session={session} expanded onPaid={onPaid}/>}</section>;
}

function PayOrder({order,session,onPaid}:{order:any;session:any;onPaid:()=>void}){
  const card=useRef<SquareCard|undefined>(undefined),savedCard=session.houseAccount?.card;
  const [open,setOpen]=useState(false),[useAnotherCard,setUseAnotherCard]=useState(!savedCard),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[amount,setAmount]=useState((Number(order.balance_due)/100).toFixed(2));
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};document.addEventListener("keydown",close);return()=>document.removeEventListener("keydown",close)},[open]);
  useEffect(()=>{if(!open||!useAnotherCard)return;let cancelled=false;const mount=async()=>{const config=await api("/storefront/config");if(!window.Square){const script=document.createElement("script");script.src=config.environment==="sandbox"?"https://sandbox.web.squarecdn.com/v1/square.js":"https://web.squarecdn.com/v1/square.js";script.async=true;await new Promise<void>((resolve,reject)=>{script.onload=()=>resolve();script.onerror=()=>reject(new Error("Secure card fields could not load."));document.head.appendChild(script);});}if(cancelled||!window.Square)return;card.current=await window.Square.payments(config.applicationId,config.locationId).card();await card.current.attach(`#order-card-${order.id}`);if(!cancelled)setReady(true);};void mount().catch(cause=>setError(cause.message));return()=>{cancelled=true;setReady(false);void card.current?.destroy().catch(()=>{});card.current=undefined;}},[open,useAnotherCard,order.id]);
  const amountCents=Math.round(Number(amount)*100),maximum=Number(order.balance_due),reference=order.receipt_number||String(order.square_order_id).slice(-8);
  const finish=async(sourceId:string)=>{setBusy(true);setError("");try{if(!Number.isFinite(amountCents)||amountCents<1||amountCents>maximum)throw new Error(`Enter an amount between $0.01 and ${cash(maximum,order.currency)}.`);await api(`/storefront/orders/${order.id}/pay`,{method:"POST",body:JSON.stringify({sourceId,idempotencyKey:crypto.randomUUID(),amount:amountCents})});setOpen(false);onPaid();}catch(cause){setError(cause instanceof Error?cause.message:"Payment failed.");}finally{setBusy(false);}};
  return <>{<button className="table-pay-action" type="button" onClick={()=>setOpen(true)}><CreditCard/> Pay order</button>}{open?<div className="statement-payment-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}><section className="statement-payment-modal" role="dialog" aria-modal="true" aria-labelledby={`pay-order-${order.id}`}><header><div><span>Credit order payment</span><h2 id={`pay-order-${order.id}`}>Pay order {reference}</h2><p>{day(order.ordered_at)} · {cash(maximum,order.currency)} outstanding</p></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close payment"><X/></button></header><div className="statement-payment"><div className="statement-payment-options"><label><span>Payment amount</span><div className="statement-payment-amount"><b>$</b><input type="number" min="0.01" step="0.01" max={(maximum/100).toFixed(2)} value={amount} onChange={event=>setAmount(event.target.value)}/></div><small>Pay all or part of this order, up to {cash(maximum,order.currency)}.</small></label></div>{savedCard&&!useAnotherCard?<><div className="statement-payment-heading"><CreditCard/><div><strong>Pay with {String(savedCard.brand||"card").toUpperCase()} ending in {savedCard.last4}</strong><span>Use the card already authorized for this account.</span></div></div>{error?<p className="checkout-error">{error}</p>:null}<button type="button" disabled={busy} onClick={()=>void finish("SAVED_CARD")}>{busy?"Processing...":`Pay ${cash(amountCents||0,order.currency)}`}</button><button className="statement-payment-secondary" type="button" disabled={busy} onClick={()=>{setError("");setUseAnotherCard(true)}}>Pay with another card</button></>:<><div className="statement-payment-heading"><CreditCard/><div><strong>Pay with another card</strong><span>Card details are encrypted and processed by Square.</span></div></div><div id={`order-card-${order.id}`} className="square-card"/>{!ready&&!error?<p className="statement-payment-loading">Loading secure card fields...</p>:null}{error?<p className="checkout-error">{error}</p>:null}<button type="button" disabled={busy||!ready} onClick={async()=>{setBusy(true);setError("");try{if(!card.current)throw new Error("The secure card form is still loading.");const token=await card.current.tokenize({amount:(amountCents/100).toFixed(2),currencyCode:order.currency,intent:"CHARGE",customerInitiated:true,sellerKeyedIn:false,billingContact:{givenName:session.user.firstName,familyName:session.user.lastName,email:session.user.email,countryCode:"CA"}});if(token.status!=="OK"||!token.token)throw new Error(cardErrorMessage(token.errors?.[0]?.message));await finish(token.token);}catch(cause){setError(cause instanceof Error?cause.message:"Payment failed.");setBusy(false);}}}>{busy?"Processing...":`Pay ${cash(amountCents||0,order.currency)}`}</button>{savedCard?<button className="statement-payment-secondary" type="button" onClick={()=>setUseAnotherCard(false)}>Use saved card</button>:null}</>}</div></section></div>:null}</>;
}

function PayStatement({ statement, session, expanded = false, onPaid }: { statement: any; session: any; expanded?: boolean; onPaid?: () => void }) {
  const card = useRef<SquareCard | undefined>(undefined);
  const savedCard=session.houseAccount?.card;
  const [open, setOpen] = useState(expanded),
    [useAnotherCard,setUseAnotherCard]=useState(!savedCard),
    [ready,setReady]=useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [orderId,setOrderId]=useState(""),
    [amount,setAmount]=useState(((Number(statement.balance_due??statement.closing_balance))/100).toFixed(2)),
    [paid, setPaid] = useState(false);
  useEffect(()=>{
    if(!open||expanded)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    document.addEventListener('keydown',close);
    return()=>document.removeEventListener('keydown',close);
  },[open,expanded]);
  useEffect(() => {
    if (!open||!useAnotherCard) return;
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
      if(!cancelled)setReady(true);
    };
    void mount().catch((cause) => setError(cause.message));
    return () => {
      cancelled = true;
      setReady(false);
      void card.current?.destroy().catch(() => {});
      card.current = undefined;
    };
  }, [open, statement.id, useAnotherCard]);
  if (paid) return <div className="statement-payment-success"><CreditCard/><div><strong>Payment received</strong><span>Your balance and payment history have been updated.</span></div></div>;
  if (!open)
    return (
      <button className="table-pay-action" type="button" onClick={() => setOpen(true)}>
        <CreditCard /> Pay now
      </button>
    );
  const payableOrders=(statement.orders||[]).filter((order:any)=>Number(order.balance_due)>0),selectedOrder=payableOrders.find((order:any)=>order.id===orderId),maximum=Number(selectedOrder?.balance_due??statement.balance_due??statement.closing_balance),amountCents=Math.round(Number(amount)*100);
  const finishPayment=async(sourceId:string)=>{
    setBusy(true);setError("");
    try{
      if(!Number.isFinite(amountCents)||amountCents<1||amountCents>maximum)throw new Error(`Enter an amount between $0.01 and ${cash(maximum,statement.currency)}.`);
      const path=orderId?`/storefront/orders/${orderId}/pay`:`/storefront/statements/${statement.id}/pay`;
      await api(path,{method:"POST",body:JSON.stringify({sourceId,idempotencyKey:crypto.randomUUID(),amount:amountCents})});
      setPaid(true);onPaid?.();
    }catch(cause){setError(cause instanceof Error?cause.message:"Payment failed.");}
    finally{setBusy(false);}
  };
  const paymentForm=(
    <div className="statement-payment">
      <div className="statement-payment-options">
        <label><span>Apply payment to</span><select value={orderId} onChange={event=>{const value=event.target.value;setOrderId(value);const order=payableOrders.find((item:any)=>item.id===value);setAmount((Number(order?.balance_due??statement.balance_due??statement.closing_balance)/100).toFixed(2));}}><option value="">Entire statement balance</option>{payableOrders.map((order:any)=><option key={order.id} value={order.id}>Order {order.receipt_number||order.square_order_id} · {day(order.ordered_at)} · {cash(order.balance_due,order.currency)}</option>)}</select></label>
        <label><span>Payment amount</span><div className="statement-payment-amount"><b>$</b><input type="number" min="0.01" step="0.01" max={(maximum/100).toFixed(2)} value={amount} onChange={event=>setAmount(event.target.value)}/></div></label>
      </div>
      {savedCard&&!useAnotherCard?<>
        <div className="statement-payment-heading"><CreditCard/><div><strong>Pay with {String(savedCard.brand||'card').toUpperCase()} ending in {savedCard.last4}</strong><span>Use the card already authorized for this institutional account.</span></div></div>
        {error?<p className="checkout-error">{error}</p>:null}
        <button type="button" disabled={busy} onClick={()=>void finishPayment("SAVED_CARD")}>{busy?"Processing...":`Pay ${cash(amountCents||0,statement.currency)}`}</button>
        <button className="statement-payment-secondary" type="button" disabled={busy} onClick={()=>{setError("");setUseAnotherCard(true);}}>Pay with another card</button>
      </>:<>
        <div className="statement-payment-heading"><CreditCard/><div><strong>Pay with another card</strong><span>Card details are encrypted and processed by Square.</span></div></div>
        <div id={`statement-card-${statement.id}`} className="square-card" />
        {!ready&&!error?<p className="statement-payment-loading">Loading secure card fields...</p>:null}
        {error ? <p className="checkout-error">{error}</p> : null}
        <button
        type="button"
        disabled={busy||!ready}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            if (!card.current) throw new Error("The secure card form is still loading.");
            const token = await card.current.tokenize({
              amount: (amountCents / 100).toFixed(2),
              currencyCode: statement.currency,
              intent: "CHARGE",
              customerInitiated: true,
              sellerKeyedIn: false,
              billingContact: {
                givenName: session.user.firstName,
                familyName: session.user.lastName,
                email: session.user.email,
                phone: session.profile?.default_phone || session.user.phone || undefined,
                addressLines: [session.profile?.default_address?.addressLine1, session.profile?.default_address?.addressLine2].filter(Boolean),
                city: session.profile?.default_address?.locality || undefined,
                state: session.profile?.default_address?.administrativeDistrictLevel1 || undefined,
                postalCode: session.profile?.default_address?.postalCode || undefined,
                countryCode: session.profile?.default_address?.country || "CA",
              },
            });
            if (token.status !== "OK" || !token.token) throw new Error(cardErrorMessage(token.errors?.[0]?.message));
            await finishPayment(token.token);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Payment failed.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Processing..." : `Pay ${cash(amountCents||0, statement.currency)}`}
        </button>
        {savedCard?<button className="statement-payment-secondary" type="button" disabled={busy} onClick={()=>{setError("");setUseAnotherCard(false);}}>Use saved card instead</button>:null}
      </>}
    </div>
  );
  if(expanded)return paymentForm;
  return <div className="statement-payment-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}><section className="statement-payment-modal" role="dialog" aria-modal="true" aria-labelledby={`pay-statement-${statement.id}`}><header><div><span>Invoice payment</span><h2 id={`pay-statement-${statement.id}`}>{statement.statement_number}</h2><p>{cash(statement.closing_balance,statement.currency)} due</p></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close payment form" title="Close"><X/></button></header>{paymentForm}</section></div>;
}

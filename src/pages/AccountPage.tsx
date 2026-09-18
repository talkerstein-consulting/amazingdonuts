import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { ArrowLeft, Building2, ChevronDown, CreditCard, Download, Eye, EyeOff, Heart, LogOut, Package, Pencil, ReceiptText, RefreshCw, Trash2, Truck, UserRound, X } from "lucide-react";
import { customizationFor } from "../lib/custom-order";
import AuthModal from "../shop/AuthModal";
import "../index.css";
import "../components/brand/brand.css";
import "../shop/shop.css";
import "./commerce.css";
import AddressAutocomplete, { type Address, type SavedAddress } from "../components/AddressAutocomplete";
import ProductTile from "../components/ProductTile";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { NavThemeProvider } from "../lib/nav-theme";
import SquircleDefs from "../components/brand/SquircleDefs";
import { BrandButton } from "../components/brand";
import CartDrawer from "../shop/CartDrawer";
import ProductPanel from "../shop/ProductPanel";
import { ShopProvider, useBoxQty, useShop } from "../lib/shop";
import { formatNorthAmericanPhone } from "../lib/phone";
import { PRODUCTS } from "../data/products";
import { fallbackProductImage } from "../lib/product-image";

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

/**
 * The account screens run inside the shop's store.
 *
 * The wishlist draws real product tiles, and a tile is a live control: it can
 * be opened and it can be added to the bag. Both need `ShopProvider`, and the
 * panel and the drawer have to be on the page for the two actions to land
 * somewhere — the same three pieces the search results page wraps itself in
 * for exactly the same reason.
 */
export default function AccountPage() {
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <NavThemeProvider>
      <ShopProvider>
        <SquircleDefs />
        {/* The site's own navbar and footer, not a stripped commerce bar of
            this page's own. The account is a page of the site: it needs the
            menu, the search, and above all the bag - a wishlist that can add
            to the cart with no bag on screen was an add going nowhere the
            visitor could see. */}
        <Header onSignIn={() => setAuthOpen(true)} />
        <AccountShell />
        <Footer ready />
        <ProductPanelHost />
        <CartDrawer />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </ShopProvider>
    </NavThemeProvider>
  );
}

/* The panel renders only for the product that is open, and reads that from the
   store rather than being handed it. */
function ProductPanelHost() {
  const { product } = useShop();
  return product ? <ProductPanel key={product.id} product={product} /> : null;
}

function AccountShell() {
  const resetToken = new URLSearchParams(location.search).get("reset");
  const statementToken = new URLSearchParams(location.search).get("statement");
  const [session, setSession] = useState<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [creditAccount, setCreditAccount] = useState<any>();
  const [application, setApplication] = useState<any>();
  const { wishlist, toggleWishlist } = useShop();
  const [authOpen, setAuthOpen] = useState(false);
  /* `#wishlist` opens on the saved hearts. The header's Favourites row points
     here, and without this it landed on the order list — a link named for one
     thing showing another. Any other hash falls through to orders. */
  const [view, setView] = useState<View>(() => {
    const search = new URLSearchParams(location.search);
    if (search.has("statement") || search.has("replace-card")) return "house";
    const hash = location.hash.slice(1);
    return hash === "wishlist" || hash === "profile" || hash === "house" ? hash : "orders";
  });
  const [message, setMessage] = useState("");
  const [loadingAccount, setLoadingAccount] = useState(true);
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
      .catch((error) => setMessage(error.message))
      .finally(() => setLoadingAccount(false));
  useEffect(() => {
    if (!resetToken) void load();
    const refresh = () => { if (!resetToken) void load(); };
    window.addEventListener("amazing:auth-changed", refresh);
    return () => window.removeEventListener("amazing:auth-changed", refresh);
  }, [resetToken]);
  useEffect(() => {
    if (!session?.user || view !== "orders") return;
    let cancelled = false, busy = false;
    const refresh = async () => {
      if (document.hidden || busy) return;
      busy = true;
      try { const body = await api("/storefront/orders"); if (!cancelled) setOrders(body.orders); }
      catch { if (!cancelled) setMessage("Order updates are temporarily unavailable. Your last order details are shown."); }
      finally { busy = false; }
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [session?.user?.id, view]);
  useEffect(() => {
    if (!session?.houseAccount || view !== "house") return;
    let cancelled = false, busy = false;
    const refresh = async () => {
      if (document.hidden || busy) return;
      busy = true;
      try {
        const [next, creditBody] = await Promise.all([api("/storefront/session"), api("/portal/account")]);
        if (!cancelled) { setSession(next); setCreditAccount(creditBody.account); }
      } catch { /* Keep the last known account details visible during a temporary outage. */ }
      finally { busy = false; }
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [session?.houseAccount?.id, view]);
  useEffect(() => {
    const sync = () => {
      const next = location.hash.slice(1);
      if (next === "orders" || next === "wishlist" || next === "profile" || next === "house") setView(next);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  if (resetToken) return <PasswordReset token={resetToken} />;
  if (loadingAccount) return <main className="commerce-shell account-loading" role="status" aria-live="polite"><span className="account-loading__spinner" /><p>Loading your account...</p></main>;
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
          <BrandButton onClick={() => setAuthOpen(true)}>Sign in or create account</BrandButton>
        </section>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={load} />
      </main>
    );
  return (
    <main className="commerce-shell">
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
          <button className={view === "orders" ? "active" : ""} onClick={() => setView("orders")} aria-label="Orders" title="Orders">
            <Package />
            <span>Orders</span>
          </button>
          <button className={view === "wishlist" ? "active" : ""} onClick={() => setView("wishlist")} aria-label="Wishlist" title="Wishlist">
            <Heart />
            <span>Wishlist</span>
          </button>
          <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")} aria-label="Profile" title="Profile">
            <UserRound />
            <span>Profile</span>
          </button>
          <button className={view === "house" ? "active" : ""} onClick={() => setView("house")} aria-label="Institutional account" title="Institutional account">
            <Building2 />
            <span data-short="Institutional">Institutional account</span>
          </button>
          {/* Sign out lived in the page's own top bar. The site navbar replaced
              that bar, and this is the one control on it with nowhere else to
              go - so it joins the account's own list, set apart from the four
              views because it is not one of them. */}
          <button
            className="account-nav__signout"
            onClick={async () => {
              await api("/auth/logout", { method: "POST" });
              location.assign("/shop/");
            }}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut />
            <span>Sign out</span>
          </button>
          {session.houseAccount && (
            <div className="house-credit">
              <div className="house-credit__heading"><Building2 /><strong>{session.houseAccount.organizationName}</strong></div>
              <span>{cash(session.houseAccount.credit.available)} available</span>
            </div>
          )}
        </aside>
        <section className="account-content">
          {view === "orders" ? (
            <Orders orders={orders} />
          ) : view === "wishlist" ? (
            <Wishlist productIds={wishlist} onRemoved={toggleWishlist} />
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

/**
 * The saved products, drawn by the catalogue's own tile.
 *
 * This used to be a card of its own — a plain square photo, a name, a price,
 * and a heart. Four properties of the same object as `ProductTile`, already
 * drifted from it: no squircle bed, no tag, no add knob, a different type
 * scale. A visitor's favourites are the last place a product should look less
 * like itself than it does in the grid they saved it from, so the wishlist
 * renders the same component the catalogue, the search results and the nav
 * drawer render.
 *
 * The heart moves to the top-LEFT of the bed. Top-right is where the add knob
 * lives on every tile on the site, and two controls cannot share that corner.
 */
/* A saved product that cannot simply be dropped in the bag: a print, a letter
   cake and a build-your-own box are all configured on their own page before
   they mean anything, and adding one with a blank spec makes a line checkout
   will refuse. "Add all" takes the rest and says how many it took. */
const needsConfiguring = (id: string) => Boolean(customizationFor(id));

function Wishlist({productIds,onRemoved}:{productIds:string[];onRemoved:(id:string)=>void}) {
  const {openProduct,add,openCart,products:catalogProducts}=useShop();
  const boxQty=useBoxQty();
  const products=productIds.flatMap(id=>{const product=catalogProducts.find(item=>item.id===id);return product?[product]:[]});
  const addable=products.filter(product=>product.available !== false && !needsConfiguring(product.id));
  const skipped=products.filter(product=>needsConfiguring(product.id)).length;
  return <><div className="commerce-heading"><p>Saved for later</p><h1>Your wishlist</h1></div>{products.length?<>{addable.length>0&&<div className="wishlist-actions"><button type="button" className="wishlist-actions__add" onClick={()=>{
    /* One drawer at the end, not one per product: the adds are silent and the
       bag opening once is the confirmation for all of them. */
    addable.forEach(product=>add(product,1,{openCart:false}));
    openCart();
  }}>Add all to bag{addable.length===products.length?"":` (${addable.length})`}</button>{skipped>0&&<small>{skipped===1?"One saved product is made to order":`${skipped} saved products are made to order`} — open {skipped===1?"it":"them"} to choose the details.</small>}</div>}<div className="shop-grid wishlist-grid">{products.map(product=><article key={product.id} className="wishlist-tile"><ProductTile product={product} onOpen={item=>openProduct(item.id)} inBox={Boolean(boxQty[product.id])} bedCorner={<button type="button" className="wishlist-tile__remove" onClick={()=>onRemoved(product.id)} aria-label={`Remove ${product.name} from wishlist`} title="Remove from wishlist"><Heart fill="currentColor"/></button>}/></article>)}</div></>:<div className="no-orders"><Heart/><h2>No saved favourites yet</h2><p>Tap the heart on any product to keep it here.</p><a href="/shop/">Browse products</a></div>}</>;
}

function PasswordReset({token}:{token:string}){
  const [password,setPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  return <main className="commerce-shell account-gate"><a href="/shop/"><ArrowLeft/> Back to shop</a><section><UserRound/><h1>Choose a new password</h1><p>Your reset link can be used once and expires after one hour.</p><form className="password-reset-form" onSubmit={async event=>{event.preventDefault();setMessage("");if(password!==confirmPassword){setMessage("Passwords do not match.");return;}setBusy(true);try{await api("/auth/reset-password",{method:"POST",body:JSON.stringify({token,password})});location.assign("/account/");}catch(error:any){setMessage(error.message);}finally{setBusy(false);}}}><label><span>New password</span><input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)}/></label><label><span>Confirm password</span><input type="password" minLength={8} required autoComplete="new-password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)}/></label>{message&&<p role="alert">{message}</p>}<button disabled={busy}>{busy?"Updating...":"Update password"}</button></form></section></main>;
}

function Orders({ orders }: { orders: any[] }) {
  const { products, add, openCart } = useShop();
  const [reorderMessage, setReorderMessage] = useState('');
  const productFor = (name: string) => products.find(item => item.name.toLowerCase() === String(name || '').toLowerCase());
  const imageProductFor = (name: string) => productFor(name) || PRODUCTS.find(item => item.name.toLowerCase() === String(name || '').toLowerCase());
  const orderAgain = (order: any) => {
    let added = 0;
    let unavailable = 0;
    for (const line of order.line_items || []) {
      const product = productFor(line.name);
      if (product?.available !== false && product && !needsConfiguring(product.id) && add(product, Number(line.quantity) || 1, {openCart:false})) added++;
      else unavailable++;
    }
    setReorderMessage(unavailable ? `${unavailable} item${unavailable === 1 ? '' : 's'} need a new selection or are no longer available.` : '');
    if (added) openCart();
  };
  const statusLabel = (order: any) => /refund/i.test(order.paymentStatus || "") ? order.paymentStatus : order.fulfillmentStatus || "Order received";
  const paymentLabel = (order: any) => order.payment_method === "house_account" ? "Pay on account" : order.payment_method === "cash" ? "Cash" : order.payment_method === "card" ? "Card" : "";
  const orderMeta = (order: any) => [paymentLabel(order), order.paymentStatus, order.fulfillment?.type === 'pickup' ? 'Pickup' : order.fulfillment?.type === 'delivery' ? 'Delivery' : ''].filter(Boolean).join(' · ');
  return (
    <>
      <div className="commerce-heading">
        <p>Order history</p>
        <h1>Your orders</h1>
      </div>
      {reorderMessage && <p className="account-message" role="status">{reorderMessage}</p>}
      {orders.length ? (
        <div className="customer-orders">
          {orders.map((order) => (
            <article key={order.id} className="stacked-surface">
              <header>
                <div>
                  <span>{day(order.ordered_at)}</span>
                  <strong>{order.simulated ? "Local test order" : "Order"} #{String(order.square_order_id || order.id || '').slice(-8)}</strong>
                </div>
                <em>{statusLabel(order)}</em>
              </header>
              <div>
                {(order.line_items || []).map((line: any) => {
                  const imageProduct = imageProductFor(line.name);
                  return <p key={line.uid || line.name}>
                    <span>
                      {imageProduct && <img className="order-line-image" src={imageProduct.img} alt="" onError={(event) => fallbackProductImage(event, imageProduct.id)} />}
                      {line.name} × {line.quantity}
                    </span>
                    <b>{cash(line.total_money?.amount, order.currency)}</b>
                  </p>;
                })}
              </div>
              {order.breakdown && <dl className="order-breakdown">
                <div><dt>Subtotal</dt><dd>{cash(order.breakdown.merchandise, order.currency)}</dd></div>
                {order.breakdown.discount > 0 && <div><dt>Discount</dt><dd>-{cash(order.breakdown.discount, order.currency)}</dd></div>}
                {order.fulfillment?.type === "delivery" && <div><dt>Delivery fee</dt><dd>{cash(order.breakdown.deliveryFee, order.currency)}</dd></div>}
                <div><dt>{order.taxes?.length === 1 && order.taxes[0].percentage ? `${order.taxes[0].name || 'Tax'} (${order.taxes[0].percentage}%)` : 'Tax'}</dt><dd>{cash(order.breakdown.tax, order.currency)}</dd></div>
                {order.breakdown.tip > 0 && <div><dt>Tip</dt><dd>{cash(order.breakdown.tip, order.currency)}</dd></div>}
                <div><dt>Total</dt><dd>{cash(order.breakdown.total, order.currency)}</dd></div>
              </dl>}
              {order.scheduledAt && <p className="order-schedule">Scheduled {order.fulfillment?.type === "delivery" ? "delivery" : "pickup"}: {new Date(order.scheduledAt).toLocaleString("en-CA", {timeZone:"America/Toronto",dateStyle:"medium",timeStyle:"short"})} Toronto time</p>}
              {order.delivery?.estimatedDeliveryAt && order.delivery.status !== "dispatch_failed" && <p className="order-schedule">Estimated arrival: {new Date(order.delivery.estimatedDeliveryAt).toLocaleString("en-CA", {timeZone:"America/Toronto",dateStyle:"medium",timeStyle:"short"})} Toronto time</p>}
              {order.liveStatusAvailable === false && <p className="order-schedule">Live updates temporarily unavailable.</p>}
              <footer>
                <span>
                  {orderMeta(order) || 'Order received'}
                </span>
                <strong>{cash(order.total, order.currency)}</strong>
              </footer>
              {order.receiptUrl && /^https:\/\/([^/]+\.)?squareup\.com\//i.test(order.receiptUrl) && <a className="order-receipt" href={order.receiptUrl} target="_blank" rel="noopener noreferrer"><Download size={17} /> Open Square receipt</a>}
              {order.delivery && <p className="delivery-test-status"><Truck/> {order.delivery.provider === "uber_direct" ? `Uber Direct${order.delivery.environment === "sandbox" ? " test" : ""}` : order.delivery.provider === "own_driver" ? (order.delivery.assignedDriverName || "Amazing Donuts driver") : "Awaiting driver assignment"}: {String(order.delivery.statusLabel || order.delivery.status || 'Awaiting dispatch').replace(/_/g," ")}{order.delivery.trackingUrl&&<a href={order.delivery.trackingUrl} target="_blank" rel="noreferrer">Track delivery</a>}</p>}
              <button type="button" className="account-edit-action order-again" onClick={() => orderAgain(order)}>Order again</button>
            </article>
          ))}
        </div>
      ) : (
        <div className="no-orders">
          <ReceiptText />
          <h2>No orders yet</h2>
          <p>Your completed website orders will appear here.</p>
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
  const [editing,setEditing]=useState(false);
  const [deleteOpen,setDeleteOpen]=useState(false),[deleteConfirmation,setDeleteConfirmation]=useState(""),[deleteError,setDeleteError]=useState(""),[deleting,setDeleting]=useState(false);
  const loadAddresses=()=>api('/storefront/addresses').then(body=>setAddresses(body.addresses||[]));
  useEffect(()=>{void loadAddresses();void api('/storefront/config').then(body=>setPlacesEnabled(Boolean(body.placesEnabled)))},[]);
  const selectAddress=(item:SavedAddress)=>{setSelectedId(item.id);setAddress({addressLine1:item.addressLine1,addressLine2:item.addressLine2,locality:item.locality,administrativeDistrictLevel1:item.administrativeDistrictLevel1,postalCode:item.postalCode,country:item.country});setLabel(item.label);setAddressType(item.addressType);setIsDefault(item.isDefault);setMessage("");};
  const resetAddress=()=>{setSelectedId(null);setAddress(blank);setLabel("Other");setAddressType('other');setIsDefault(addresses.length===0);setMessage("");};
  const removeAddress=async(item:SavedAddress)=>{if(!window.confirm(`Delete ${item.label} address?`))return;try{await api(`/storefront/addresses/${item.id}`,{method:'DELETE'});if(selectedId===item.id)resetAddress();await loadAddresses();setMessage(`${item.label} address deleted.`);}catch(cause){setMessage(cause instanceof Error?cause.message:'Address could not be deleted.');}};
  return (
    <>
      <div className="commerce-heading">
        <p>Account details</p>
        <h1>Your profile</h1>
        {!editing && <button type="button" className="account-edit-action" onClick={() => {setEditing(true);if(addresses.length&&!selectedId)selectAddress(addresses[0]);}}>Edit profile</button>}
      </div>
      {!editing && <div className="profile-summary"><strong>{[profile.first_name || session.user?.firstName, profile.last_name || session.user?.lastName].filter(Boolean).join(" ") || "Account details"}</strong><span>{profile.email || session.user?.email}</span><span>{formatNorthAmericanPhone(profile.default_phone || profile.phone || "")}</span></div>}
      <div className="saved-addresses" aria-label="Saved addresses">{addresses.map(item=><div className={`saved-addresses__card${selectedId===item.id&&editing?' active':''}`} key={item.id}><div><strong>{item.label}{item.isDefault?' · Default':''}</strong><span>{item.addressLine1}{item.addressLine2?`, ${item.addressLine2}`:''}</span><small>{item.locality} {item.postalCode}</small></div><div className="saved-addresses__actions"><button type="button" aria-label={`Edit ${item.label}`} onClick={()=>{selectAddress(item);setEditing(true);}}><Pencil size={17}/></button><button type="button" aria-label={`Delete ${item.label}`} onClick={()=>void removeAddress(item)}><Trash2 size={17}/></button></div></div>)}<button type="button" className="saved-addresses__add" onClick={()=>{resetAddress();setEditing(true);}}>+ Add address</button></div>
      {!editing && message && <p className="profile-message" role="status">{message}</p>}
      {editing && <form
        className="profile-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const normalized = (value: unknown) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
          if (address.addressLine1 && addresses.some((item) => item.id !== selectedId &&
            normalized(item.addressLine1) === normalized(address.addressLine1) &&
            normalized(item.addressLine2) === normalized(address.addressLine2) &&
            normalized(item.postalCode).replace(/\s/g, "") === normalized(address.postalCode).replace(/\s/g, ""))) {
            setMessage("This address is already saved. Select it from your addresses instead.");
            return;
          }
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
          setMessage("Profile and address saved.");setEditing(false);onSaved();
        }}
      >
        <fieldset disabled={!editing} className="account-edit-fields">
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
        {selectedId&&<button className="profile-delete" type="button" onClick={()=>{const item=addresses.find(saved=>saved.id===selectedId);if(item)void removeAddress(item);}}>Delete address</button>}
        {message&&<p className="profile-message" role="status">{message}</p>}
        <BrandButton type="submit">Save profile</BrandButton>
        <button type="button" className="account-edit-cancel" onClick={() => setEditing(false)}>Cancel</button>
        </fieldset>
      </form>}
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
  const [replacingCard, setReplacingCard] = useState(() => new URLSearchParams(location.search).has("replace-card"));
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
  const latestStatement=account?.statements?.[0];
  const currentStatement=account?.currentStatement;
  const cardSummary=<div className="house-card-summary">
    <p title={session.houseAccount?.card ? `${session.houseAccount.card.brand || "Card"} ending in ${session.houseAccount.card.last4} is on file.` : undefined}><CreditCard /> {session.houseAccount?.card ? `${session.houseAccount.card.brand || "Card"} •••• ${session.houseAccount.card.last4}` : "No card on file"}</p>
    {session.houseAccount?.role === "account_admin" && session.houseAccount.card && !replacingCard ? <button type="button" onClick={() => setReplacingCard(true)}><RefreshCw /> Change card</button> : null}
  </div>;
  if (session.houseAccount)
    return (
      <>
        <div className="commerce-heading">
          <p>Business credit</p>
          <h1>Your institutional account</h1>
        </div>
        <div className="house-application-status">
          <div className="house-application-status__title"><Building2 /><h2>{session.houseAccount.organizationName}</h2></div>
          <p>
            Your account is {session.houseAccount.status}. You currently have <strong>{cash(session.houseAccount.credit.available)}</strong> available.
          </p>
          <div className="house-account-facts">
            <p><span>Next statement</span><strong>{currentStatement?.next_statement_date ? day(currentStatement.next_statement_date) : "Scheduled by bakery"}</strong></p>
            <p><span>Last statement</span><strong>{latestStatement ? cash(latestStatement.closing_balance,latestStatement.currency) : "None issued yet"}</strong></p>
            <p><span>Payment status</span><strong>{latestStatement ? String(latestStatement.status).replace(/_/g," ") : "No payment due"}</strong></p>
          </div>
        </div>
        {featuredStatement?<StatementPaymentPanel statement={{...featuredStatement,orders:(account?.orders||[]).filter((order:any)=>order.payment_method==="house_account"&&Number(order.balance_due)>0)}} session={session} onPaid={onStatementPaid}/>:null}
        {statementToken&&account&&!linkedStatement?<div className="statement-link-error" role="alert"><ReceiptText/><div><strong>We could not match this payment link</strong><span>The invoice may belong to another institutional account or the link may no longer be valid.</span></div></div>:null}
        {session.houseAccount.role === "account_admin" && account ? <OrganizationSettings account={account} cardSummary={cardSummary} /> : cardSummary}
        {session.houseAccount.role === "account_admin" && (!session.houseAccount.card || replacingCard) ? <SaveHouseCard session={session} replacing={Boolean(session.houseAccount.card)} onCancel={session.houseAccount.card ? () => {
          const url = new URL(location.href);
          url.searchParams.delete("replace-card");
          history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          setReplacingCard(false);
        } : undefined} onSaved={() => {
          const url = new URL(location.href);
          url.searchParams.delete("replace-card");
          history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          setReplacingCard(false);
          onStatementPaid();
        }} /> : null}
        <CustomerMemberManager session={session} account={account} onChanged={onStatementPaid} />
        <InstitutionalActivity account={account} />
        <InstitutionalStatements account={account} session={session} featuredStatement={featuredStatement} />
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

function InstitutionalActivity({account}:{account:any}){
  const orders=(account?.orders||[]).filter((order:any)=>order.payment_method==="house_account");
  const orderFor=(entry:any)=>orders.find((order:any)=>[order.id,order.square_order_id,order.receipt_number]
    .filter(Boolean).some(reference=>String(entry.source_id||entry.description||"").includes(String(reference))));
  const matched=new Set((account?.ledger||[]).map(orderFor).filter(Boolean).map((order:any)=>order.id));
  const rows=[
    ...(account?.ledger||[]).map((entry:any)=>({key:entry.id,date:entry.effective_at,description:entry.description,amount:Number(entry.amount),currency:entry.currency,order:orderFor(entry)})),
    ...orders.filter((order:any)=>!matched.has(order.id)).map((order:any)=>({key:order.id,date:order.ordered_at,description:`Order ${order.receipt_number||String(order.square_order_id||order.id).slice(-8)}`,amount:Number(order.total),currency:order.currency,order})),
  ].sort((left:any,right:any)=>new Date(right.date).getTime()-new Date(left.date).getTime());
  return <div className="customer-orders institutional-activity">
    <h2>Account activity</h2>
    <p>Purchases, payments, and adjustments on your institutional account.</p>
    {rows.length?<div className="account-table-scroll"><table className="account-data-table activity-data-table"><thead><tr><th>Date</th><th>Activity</th><th>Status</th><th className="money-column">Amount</th></tr></thead><tbody>{rows.map((row:any)=><tr key={row.key}><td>{day(row.date)}</td><td><strong>{row.description}</strong></td><td>{row.order?Number(row.order.balance_due)>0?"Unpaid":"Paid":row.amount<0?"Credit":"Charge"}</td><td className="money-column">{cash(row.amount,row.currency)}</td></tr>)}</tbody></table></div>:<p>No account activity yet.</p>}
  </div>;
}

function InstitutionalStatements({account,session,featuredStatement}:{account:any;session:any;featuredStatement:any}){
  const current=account?.currentStatement;
  const statements=account?.statements||[];
  const records=[...(current?[{...current,id:"current",status:"draft"}]:[]),...statements];
  return <div className="customer-orders institutional-statements">
    <h2>Statements</h2>
    <p>The current statement updates as account activity changes. Payment becomes due only after it is issued.</p>
    <div className="statement-records">{records.map((statement:any)=>{
      const draft=statement.status==="draft";
      const settled=["paid","void"].includes(statement.status);
      const featured=statement.id===featuredStatement?.id;
      const payable=draft?null:{...statement,orders:statementOrders(account.orders,statement)};
      const pdfUrl=draft?"/api/house/storefront/current-statement.pdf":`/api/house/statements/${statement.id}.pdf`;
      return <section className="statement-record" key={statement.id} aria-label={statement.statement_number}>
        <div className="statement-record__heading"><div><h3>{statement.statement_number}</h3>{draft?<p>Updates as activity posts</p>:null}</div><span className={`statement-status statement-status--${statement.status}`}>{draft?"Live preview":String(statement.status).replace(/_/g," ")}</span></div>
        <dl className="statement-record__facts"><div><dt>Period</dt><dd>{day(statement.period_start)} – {day(statement.period_end)}</dd></div><div><dt>{draft?"Current balance":"Balance due"}</dt><dd>{cash(statement.balance_due??statement.closing_balance,statement.currency)}</dd></div><div><dt>Payment</dt><dd>{draft?"Not yet due":settled?statement.status==="paid"?"Paid":"Void":featured?"Options above":"Available"}</dd></div></dl>
        <div className="statement-record__actions"><a href={pdfUrl} target="_blank" rel="noreferrer"><Download size={18}/> Download PDF</a>{!draft&&!settled&&!featured&&payable?<PayStatement statement={payable} session={session}/>:null}</div>
      </section>;
    })}</div>
  </div>;
}

function OrganizationSettings({account,cardSummary}:{account:any;cardSummary:ReactNode}){
  const [message,setMessage]=useState(""),[editing,setEditing]=useState(false),address=account.metadata?.address||{};
  return <section className="organization-settings"><div className="section-heading"><p>Organization profile</p><h2>Account details</h2></div>{!editing?<div className="organization-profile-card"><strong>{account.organization_name}</strong><span>{account.billing_contact} · {account.billing_email}</span><span>{[address.addressLine1,address.addressLine2,address.locality,address.postalCode].filter(Boolean).join(', ') || 'No organization address saved'}</span><div className="organization-profile-card__actions"><div><button type="button" className="account-edit-action" onClick={()=>setEditing(true)}><Pencil size={17}/> Edit account details</button></div>{cardSummary}</div></div>:<form className="house-application-form" onSubmit={async event=>{event.preventDefault();setMessage("");const data=new FormData(event.currentTarget);try{await api("/storefront/house-settings",{method:"PATCH",body:JSON.stringify({organizationName:data.get("organizationName"),organizationType:data.get("organizationType"),billingContact:data.get("billingContact"),billingEmail:data.get("billingEmail"),phone:data.get("phone"),organizationPin:data.get("organizationPin"),address:{addressLine1:data.get("addressLine1"),addressLine2:data.get("addressLine2"),locality:data.get("locality"),administrativeDistrictLevel1:data.get("province"),postalCode:data.get("postalCode"),country:"CA"}})});setMessage("Organization details updated.");setEditing(false);}catch(cause){setMessage(cause instanceof Error?cause.message:"Details could not be updated.");}}}>
    <fieldset disabled={!editing} className="account-edit-fields">
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
    {message?<p className="profile-message wide" role="status">{message}</p>:null}<BrandButton type="submit" block className="wide">Save account details</BrandButton><BrandButton type="button" variant="outline" block className="account-edit-cancel wide" onClick={()=>setEditing(false)}>Cancel</BrandButton>
    </fieldset>
  </form>}{!editing&&message?<p className="profile-message" role="status">{message}</p>:null}</section>;
}

function CustomerMemberManager({ session, account, onChanged }: { session: any; account: any; onChanged:()=>void }) {
  const initialType = organizationRoles[session.houseAccount.organizationType] ? session.houseAccount.organizationType : "Other business";
  const organizationType = initialType;
  const [message, setMessage] = useState("");
  const [addOpen,setAddOpen]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [increaseOpen,setIncreaseOpen]=useState(false);
  const availableCredit=Number(account?.credit?.available||0);
  const canManage=session.houseAccount.role==="account_admin";
  return (
    <section className="house-application-status">
      <Building2 />
      <h2>Organization members</h2>
      <p>{canManage?"Add people who already have an Amazing Donuts website account. ":"Everyone authorized to use this institutional account is listed below. "}Every member draws from the same {cash(availableCredit)} currently available to the organization.</p>
      {canManage&&!addOpen?<button type="button" className="account-edit-action" onClick={()=>setAddOpen(true)}>Add member</button>:null}
      {canManage&&addOpen?<form
        className="house-application-form member-add-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setMessage("");
          const data = new FormData(event.currentTarget);
          try {
            await api("/storefront/house-members", { method: "POST", body: JSON.stringify({ email: data.get("email"), organizationType, organizationRole: data.get("organizationRole"), role: data.get("role"), purchaseLimit: data.get("purchaseLimit") ? Math.round(Number(data.get("purchaseLimit")) * 100) : null, pin:data.get("pin") }) });
            setMessage("Member added.");
            setAddOpen(false);
            event.currentTarget.reset();
            onChanged();
          } catch (cause) {
            setMessage(cause instanceof Error ? cause.message : "Member could not be added.");
          }
        }}
      >
        <label>
          <span>Member role</span>
          <div className="member-edit-select"><select name="organizationRole">
            {organizationRoles[organizationType].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select><ChevronDown aria-hidden="true" size={18}/></div>
        </label>
        <label>
          <span>Member email</span>
          <input name="email" type="email" required />
        </label>
        <label>
          <span>Permissions</span>
          <div className="member-edit-select"><select name="role">
            <option value="purchaser">Can purchase</option>
            <option value="account_admin">Account admin</option>
            <option value="viewer">View only</option>
          </select><ChevronDown aria-hidden="true" size={18}/></div>
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
        <div className="member-add-actions wide"><BrandButton type="button" variant="outline" onClick={()=>setAddOpen(false)}>Cancel</BrandButton><BrandButton type="submit">Add member</BrandButton></div>
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
                <label><span>Member role</span><div className="member-edit-select"><select name="organizationRole" defaultValue={member.organization_role}>{organizationRoles[organizationType].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><ChevronDown aria-hidden="true" size={18}/></div></label>
                <label><span>Permissions</span><div className="member-edit-select"><select name="role" defaultValue={member.role}><option value="purchaser">Can purchase</option><option value="account_admin">Account admin</option><option value="viewer">View only</option></select><ChevronDown aria-hidden="true" size={18}/></div></label>
                <label><span>Purchase limit</span><MoneyField name="purchaseLimit" min="0" max={(availableCredit/100).toFixed(2)} step="1" defaultValue={member.purchase_limit==null?"":Number(member.purchase_limit)/100}/><small>Maximum {cash(availableCredit)} currently available account-wide.</small></label>
                <label><span>Reset PIN <small>Optional</small></span><PinField name="pin" placeholder="Leave unchanged"/></label>
                <label><span>Status</span><div className="member-edit-select"><select name="status" defaultValue={member.status}><option value="active">Active</option><option value="disabled">Disabled</option></select><ChevronDown aria-hidden="true" size={18}/></div></label>
                <div className="member-edit-actions"><BrandButton type="button" variant="outline" onClick={()=>setEditingId(null)}>Cancel</BrandButton><BrandButton type="submit">Save member</BrandButton></div>
              </form>:<footer><span>{member.role==="account_admin"?"Account administrator":member.role==="viewer"?"View only":"Can purchase"}{member.purchase_limit!=null?` · ${cash(member.purchase_limit)} personal cap`:" · Up to account availability"}</span>{canManage?<button type="button" onClick={()=>setEditingId(member.id)}>Edit member</button>:null}</footer>}
            </article>;
          })}
        </div>
      ) : null}
      {canManage?<div className={`credit-increase-request${increaseOpen?" is-open":""}`}>
        <div><strong>Need more organization credit?</strong><span>Increasing the approved account limit requires a separate review.</span></div>
        {!increaseOpen?<button type="button" onClick={()=>setIncreaseOpen(true)}>Request more credit</button>:<form onSubmit={async event=>{event.preventDefault();setMessage("");const data=new FormData(event.currentTarget);try{await api("/storefront/credit-increase-requests",{method:"POST",body:JSON.stringify({requestedCreditLimit:Math.round(Number(data.get("requestedCreditLimit"))*100),reason:data.get("reason")})});setMessage("Credit increase request submitted for review.");setIncreaseOpen(false);}catch(cause){setMessage(cause instanceof Error?cause.message:"Request could not be submitted.");}}}><label><span>Requested total credit limit</span><MoneyField name="requestedCreditLimit" min={(Number(account.credit.creditLimit)/100+.01).toFixed(2)} step="1" required/></label><label><span>Reason for increase</span><textarea name="reason" minLength={10} maxLength={2000} required/></label><div className="member-edit-actions"><button type="button" onClick={()=>setIncreaseOpen(false)}>Cancel</button><button>Submit request</button></div></form>}
      </div>:null}
    </section>
  );
}

function SaveHouseCard({ session, replacing = false, onCancel, onSaved }: { session: any; replacing?: boolean; onCancel?: () => void; onSaved: () => void }) {
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
          if (token.status !== "OK" || !token.token) throw new Error(cardErrorMessage(token.errors?.[0]?.message));
          await api("/storefront/house-card", {
            method: "POST",
            body: JSON.stringify({
              sourceId: token.token,
              consent: true,
              cardholderName: `${session.user.firstName} ${session.user.lastName}`,
              replace: replacing,
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
        <h2>{replacing ? "Change card on file" : "Add a card on file"}</h2>
        <p>{replacing ? "Your current card stays active until the replacement is securely saved." : "This card secures the credit account and may be charged for statement balances."}</p>
        <div id="house-card-fields" className="square-card" />
      </div>
      <label className="house-card-consent">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>I authorize Amazing Donuts to save this card and charge outstanding statements when due.</span>
      </label>
      {error ? <p className="checkout-error">{error}</p> : null}
      <div className="house-card-actions">
        {onCancel ? <button className="house-card-cancel" type="button" disabled={busy} onClick={onCancel}>Cancel</button> : null}
        <button disabled={!ready || !consent || busy}>
          {busy ? "Saving card..." : replacing ? "Save replacement card" : "Save card and enable credit"}
        </button>
      </div>
    </form>
  );
}

function StatementPaymentPanel({statement,session,onPaid}:{statement:any;session:any;onPaid:()=>void}){
  const settled=['paid','void'].includes(statement.status);
  const statusDetail=statement.status==='paid'?`Paid on ${day(statement.paid_at)}`:statement.status==='void'?'Invoice voided':statement.status==='partially_paid'?`${cash(statement.balance_due,statement.currency)} remaining · Due ${day(statement.due_at)}`:`Due ${day(statement.due_at)}`;
  return <section className="statement-payment-panel" aria-labelledby="statement-payment-title"><header><div><span>{settled?'Invoice receipt':'Invoice payment'}</span><h2 id="statement-payment-title">{settled?'Invoice':'Pay'} {statement.statement_number}</h2><p>{statement.organization_name||'Institutional account'} · {statusDetail}</p></div><strong>{cash(statement.balance_due??statement.closing_balance,statement.currency)}</strong></header><div className="statement-payment-summary"><div><span>Statement period</span><b>{day(statement.period_start)} – {day(statement.period_end)}</b></div><div><span>Status</span><b>{statusDetail}</b></div><a href={`/api/house/statements/${statement.id}.pdf`} target="_blank" rel="noreferrer"><ReceiptText/> Download invoice</a></div>{settled?<div className="statement-payment-success"><CreditCard/><div><strong>{statement.status==='paid'?'Payment received':'No payment required'}</strong><span>{statement.status==='paid'?'This invoice has been paid.':'This invoice has been voided.'}</span></div></div>:<PayStatement statement={statement} session={session} expanded onPaid={onPaid}/>}</section>;
}

export function PayOrder({order,session,onPaid}:{order:any;session:any;onPaid:()=>void}){
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
  const maximum=Number(statement.balance_due??statement.closing_balance),amountCents=Math.round(Number(amount)*100);
  const finishPayment=async(sourceId:string)=>{
    setBusy(true);setError("");
    try{
      if(!Number.isFinite(amountCents)||amountCents<1||amountCents>maximum)throw new Error(`Enter an amount between $0.01 and ${cash(maximum,statement.currency)}.`);
      await api(`/storefront/statements/${statement.id}/pay`,{method:"POST",body:JSON.stringify({sourceId,idempotencyKey:crypto.randomUUID(),amount:amountCents})});
      setPaid(true);onPaid?.();
    }catch(cause){setError(cause instanceof Error?cause.message:"Payment failed.");}
    finally{setBusy(false);}
  };
  const paymentForm=(
    <div className="statement-payment">
      <div className="statement-payment-options">
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

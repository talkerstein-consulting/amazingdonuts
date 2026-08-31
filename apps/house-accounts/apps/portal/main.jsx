import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { nextDateRangeSelection } from "../../lib/date-range.js";
import { Bell, BriefcaseBusiness, Building2, CalendarRange, Check, ChevronDown, ClipboardList, Copy, CreditCard, Download, Eye, EyeOff, FileText, LayoutDashboard, LogOut, Package, Plus, ReceiptText, RefreshCw, Search, ShieldCheck, Trash2, UserCog, Users } from "lucide-react";
import "./portal.css";
import "./portal-workspaces.css";
import "./portal-notifications.css";
import "./portal-typography.css";
import "./portal-controls.css";

const cash = (amount, currency = "CAD") => new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(amount || 0) / 100);
const organizationRoles = {
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
const day = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
const demoAccount = {
  id: "demo",
  organization_name: "Eitz Chaim Schools",
  account_code_hint: "AD-1048",
  billing_email: "billing@eitzchaim.com",
  billing_contact: "Raviv Talkar",
  status: "active",
  currency: "CAD",
  payment_terms_days: 30,
  credit: {
    creditLimit: 250000,
    postedBalance: 122490,
    balance: 122490,
    reserved: 18500,
    available: 109010,
  },
  orders: [],
  ledger: [],
  statements: [],
  payments: [],
  purchasers: [],
};
const demoCareers = {
  pageEnabled: true,
  roles: [
    { id: "demo-baker", slug: "baker", title: "Overnight Baker", employment_type: "Full time", shift: "Sun - Thu, 11pm - 7am", blurb: "The first shift of the day, and the reason the cases are full at opening. You mix, proof, fry and glaze.", responsibilities: ["Run the fryer and the proofer through the overnight production list", "Mix doughs and batters to the shop recipes", "Hand the morning over to the decorating team, stocked and on time"], sort_order: 10, enabled: true },
    { id: "demo-decorator", slug: "decorator", title: "Decorator", employment_type: "Full time", shift: "Mon - Fri, 6am - 2pm", blurb: "Icing, sprinkles, printed toppers and the custom orders. Steady hands and an eye for a straight line.", responsibilities: ["Ice and finish the daily run across donuts, cupcakes and cookies", "Build custom and printed orders against the order sheet", "Keep the cases looking like the photographs"], sort_order: 20, enabled: true },
    { id: "demo-counter", slug: "counter", title: "Counter & Orders", employment_type: "Part time", shift: "Flexible, weekday mornings", blurb: "The person customers actually meet. Serving, boxing, taking online orders and knowing what is left.", responsibilities: ["Serve walk-ins and box orders for pickup", "Manage online and email orders on the day sheet", "Keep the counter and the cases tidy through the rush"], sort_order: 30, enabled: true },
    { id: "demo-driver", slug: "driver", title: "Delivery Driver", employment_type: "Part time", shift: "Early mornings, own vehicle", blurb: "Bulk and corporate orders across the city, arriving intact and when they were promised.", responsibilities: ["Run the morning delivery list across Toronto", "Check each order against its sheet before it leaves", "Be the face of the bakery at the door"], sort_order: 40, enabled: true },
  ],
};
const demoManagers = [
  { id: "demo-owner", email: "owner@amazingdonuts.com", first_name: "Raviv", last_name: "Talkar", role: "owner", status: "active" },
  { id: "demo-manager", email: "manager@amazingdonuts.com", first_name: "Store", last_name: "Manager", role: "staff", status: "active" },
];
const navItems = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "requests", label: "House applications", Icon: Building2 },
  { id: "bulk-requests", label: "Bulk requests", Icon: ClipboardList },
  { id: "accounts", label: "Accounts", Icon: Building2 },
  { id: "statements", label: "Statements", Icon: ReceiptText },
  { id: "orders", label: "Orders", Icon: Package },
  { id: "purchasers", label: "Purchasers", Icon: Users },
  { id: "careers", label: "Careers", Icon: BriefcaseBusiness },
  { id: "managers", label: "Account managers", Icon: UserCog, ownerOnly: true },
];
const viewFromHash = () => {
  const candidate = location.hash.slice(1);
  return navItems.some((item) => item.id === candidate) ? candidate : "overview";
};
async function request(path, options) {
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
async function downloadStatement(statement) {
  const response = await fetch(`/api/house/statements/${statement.id}.pdf`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || "The statement PDF could not be downloaded.");
  }
  const url = URL.createObjectURL(await response.blob()),
    link = document.createElement("a");
  link.href = url;
  link.download = `${statement.statement_number || "account-statement"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function App() {
  const demo = new URLSearchParams(location.search).has("demo"),
    [user, setUser] = useState(
      demo
        ? {
            firstName: "Raviv",
            lastName: "Talkar",
            role: "owner",
            tenantName: "Amazing Donuts",
          }
        : undefined,
    );
  const [accounts, setAccounts] = useState(demo ? [demoAccount] : null),
    [applications, setApplications] = useState([]),
    [bulkRequests, setBulkRequests] = useState([]),
    [customOrders, setCustomOrders] = useState([]),
    [careers, setCareers] = useState(demo ? demoCareers : { pageEnabled: true, roles: [] }),
    [managers, setManagers] = useState(demo ? demoManagers : []),
    [notifications, setNotifications] = useState(demo ? [{id:"demo-notice",title:"New application: North Toronto School",body:"A new house-account application is ready for review.",link:"#requests",created_at:new Date().toISOString(),read_at:null}] : []),
    [view, setView] = useState(viewFromHash),
    [error, setError] = useState("");
  const staff = ["owner", "staff"].includes(user?.role);
  const load = async () => {
    if (!user || demo) return;
    try {
      if (staff) {
        const managerRequest = user.role === "owner" ? request("/admin/managers") : Promise.resolve({ managers: [] });
        const [a, r, b, o, c, m, n] = await Promise.all([request("/admin/accounts"), request("/admin/applications"), request("/admin/bulk-requests"), request("/admin/custom-orders"), request("/admin/careers"), managerRequest, request("/admin/notifications")]);
        setAccounts(a.accounts);
        setApplications(r.applications);
        setBulkRequests(b.requests);
        setCustomOrders(o.orders);
        setCareers(c);
        setManagers(m.managers);
        setNotifications(n.notifications);
      }
      setError("");
    } catch (cause) {
      setError(cause.message);
    }
  };
  useEffect(() => {
    if (demo) return;
    request("/admin-auth/session")
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null));
  }, [demo]);
  useEffect(() => {
    load();
  }, [user, staff, demo]);
  useEffect(() => {
    const syncView = () => setView(viewFromHash());
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, []);
  if (user === undefined) return <div className="boot">Loading account service...</div>;
  if (!user) return <Login onUser={setUser} />;
  if (!staff && !demo) return <Login onUser={setUser} errorMessage="Administrator access is required." />;
  return (
    <Shell
      user={user}
      view={view}
      onView={setView}
      pending={{
        requests: applications.filter((x) => x.status === "pending").length,
        "bulk-requests": bulkRequests.filter((x) => x.status === "pending").length,
        notifications: notifications.filter((x) => !x.read_at).length,
      }}
      onRefresh={load}
      onLogout={async () => {
        if (!demo) await request("/admin-auth/logout", { method: "POST" });
        setUser(null);
      }}
    >
      {error ? <p className="global-error">{error}</p> : null}
      <Admin user={user} view={view} accounts={accounts || []} setAccounts={setAccounts} applications={applications} setApplications={setApplications} bulkRequests={bulkRequests} setBulkRequests={setBulkRequests} customOrders={customOrders} careers={careers} setCareers={setCareers} managers={managers} setManagers={setManagers} notifications={notifications} setNotifications={setNotifications} demo={demo} />
    </Shell>
  );
}

function Login({ onUser, errorMessage = "" }) {
  const [error, setError] = useState(errorMessage), [showPassword, setShowPassword] = useState(false);
  return (
    <main className="login">
      <section className="login-brand">
        <div className="brand-mark">AD</div>
        <p>Administrative access</p>
        <h1>
          House account operations,
          <br />
          without the paperwork pile.
        </h1>
        <span>Owner and staff access only. Customer accounts belong at /account/.</span>
      </section>
      <section className="login-panel">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const data = Object.fromEntries(new FormData(e.currentTarget));
            try {
              onUser(
                (
                  await request("/admin-auth/login", {
                    method: "POST",
                    body: JSON.stringify({ ...data, tenant: "amazing-donuts" }),
                  })
                ).user,
              );
            } catch (cause) {
              setError(cause.message);
            }
          }}
        >
          <ShieldCheck />
          <h2>Admin sign in</h2>
          <label>
            <span>Email address</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            <span>Password</span>
            <span className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" minLength="8" required /><button type="button" title={showPassword ? "Hide password" : "Show password"} aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff/> : <Eye/>}</button></span>
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button>Continue</button>
        </form>
      </section>
    </main>
  );
}

function Shell({ user, view, onView, pending, onRefresh, onLogout, children }) {
  const staff = ["owner", "staff"].includes(user.role),
    customerViews = ["overview", "statements", "orders"],
    title = staff ? navItems.find((x) => x.id === view)?.label : view === "overview" ? "Your account" : navItems.find((x) => x.id === view)?.label;
  return (
    <div className="shell">
      <aside>
        <div className="side-brand">
          <div className="brand-mark">AD</div>
          <div>
            <strong>{user.tenantName || "Amazing Donuts"}</strong>
            <span>House Accounts</span>
          </div>
        </div>
        <nav>
          {navItems
            .filter((x) => (staff || customerViews.includes(x.id)) && (!x.ownerOnly || user.role === "owner"))
            .map(({ id, label, Icon }) => (
              <a key={id} href={`#${id}`} className={view === id ? "active" : ""} aria-current={view === id ? "page" : undefined} title={label} onClick={() => onView(id)}>
                <Icon />
                <span>{label}</span>
                {pending?.[id] ? <b>{pending[id]}</b> : null}
              </a>
            ))}
        </nav>
        <div className="side-user">
          <div>
            {user.firstName?.[0]}
            {user.lastName?.[0]}
          </div>
          <span>
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <small>{user.role}</small>
          </span>
          <button title="Sign out" onClick={onLogout}>
            <LogOut />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div>
            <p>
              {new Date().toLocaleDateString("en-CA", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1>{title}</h1>
          </div>
          <button className="icon-button" title="Refresh" onClick={onRefresh}>
            <RefreshCw />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function Admin({ user, view, accounts, setAccounts, applications, setApplications, bulkRequests, setBulkRequests, customOrders, careers, setCareers, managers, setManagers, notifications, setNotifications, demo }) {
  const [selected, setSelected] = useState(accounts[0]?.id),
    [query, setQuery] = useState("");
  useEffect(() => {
    if (accounts.length && !selected) setSelected(accounts[0].id);
  }, [accounts, selected]);
  const visible = accounts.filter((a) => a.organization_name.toLowerCase().includes(query.toLowerCase())),
    account = accounts.find((a) => a.id === selected) || visible[0],
    totals = accounts.reduce(
      (s, a) => ({
        owed: s.owed + Number(a.credit?.balance || a.credit?.postedBalance || 0),
        available: s.available + Number(a.credit?.available || 0),
        reserved: s.reserved + Number(a.credit?.reserved || 0),
        approved: s.approved + (a.status === "active" ? Number(a.credit?.creditLimit || a.credit_limit || 0) : 0),
      }),
      { owed: 0, available: 0, reserved: 0, approved: 0 },
    );
  const statements = accounts.flatMap((a) =>
      (a.statements || []).map((x) => ({
        ...x,
        organization_name: a.organization_name,
      })),
    ),
    orders = [...customOrders, ...accounts.flatMap((a) => (a.orders || []).filter((order) => !customOrders.some((custom) => custom.square_order_id === order.square_order_id)).map((x) => ({ ...x, organization_name: a.organization_name })))],
    purchasers = accounts.flatMap((a) =>
      (a.purchasers || []).map((x) => ({
        ...x,
        organization_name: a.organization_name,
      })),
    );
  if (view === "requests") return <Applications applications={applications} setApplications={setApplications} setAccounts={setAccounts} accounts={accounts} demo={demo} />;
  if (view === "bulk-requests") return <BulkRequests requests={bulkRequests} setRequests={setBulkRequests} demo={demo} />;
  if (view === "statements")
    return (
      <Listing eyebrow="Billing" title="Statements">
        <StatementTable statements={statements} />
      </Listing>
    );
  if (view === "orders")
    return (
      <Listing eyebrow="House account activity" title="Orders">
        <OrderTable orders={orders} />
      </Listing>
    );
  if (view === "purchasers")
    return (
      <Listing eyebrow="Authorized buyers" title="Purchasers">
        <PurchaserTable purchasers={purchasers} />
      </Listing>
    );
  if (view === "careers") return <CareersManager careers={careers} setCareers={setCareers} demo={demo} />;
  if (view === "managers" && user.role === "owner") return <ManagerAdmin managers={managers} setManagers={setManagers} demo={demo} />;
  if (view === "notifications") return <NotificationCenter notifications={notifications} setNotifications={setNotifications} demo={demo}/>;
  return (
    <main className="dashboard">
      {view === "overview" ? (
        <><section className="metrics">
          <Metric label="Receivables" value={cash(totals.owed)} note={`${accounts.length} organizations`} tone="magenta" />
          <Metric label="Available credit" value={cash(totals.available)} note="Across active accounts" tone="green" />
          <Metric label="Reserved" value={cash(totals.reserved)} note="Pending online orders" tone="yellow" />
          <Metric label="Approved credit" value={cash(totals.approved)} note="Across active accounts" tone="green" />
        </section><EmailHealth demo={demo}/></>
      ) : null}
      <section className="admin-grid">
        <AccountList accounts={visible} account={account} query={query} setQuery={setQuery} setSelected={setSelected} />
        {account ? <AccountDetail account={account} staff demo={demo} /> : <div className="empty">No account selected.</div>}
      </section>
    </main>
  );
}

function EmailHealth({demo}) {
  const [status,setStatus]=useState(demo?{configured:true,ownersConfigured:true,from:"Amazing Donuts <accounts@amazingdonuts.com>"}:null),[message,setMessage]=useState("");
  useEffect(()=>{if(!demo)request("/admin/email-status").then(setStatus).catch((error)=>setMessage(error.message));},[demo]);
  return <section className="email-health"><div><strong>Email delivery</strong><span>{status?.configured&&status?.ownersConfigured?"Configured for customer and owner notifications":"Configuration needs attention"}</span>{status?.from?<small>{status.from}</small>:null}</div><button type="button" disabled={!status?.configured} onClick={async()=>{setMessage("Sending test...");try{if(demo){setMessage("Test email accepted.");return;}const result=await request("/admin/email-test",{method:"POST"});setMessage(result.accepted?"Test email accepted by the mail server.":"Mail server accepted the request.");}catch(error){setMessage(error.message);}}}>Send test email</button>{message?<p>{message}</p>:null}</section>;
}

function PasswordInput({ name = "password", autoComplete = "new-password", minLength = 10, required = true }) {
  const [visible, setVisible] = useState(false);
  return <span className="password-field"><input name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} required={required}/><button type="button" title={visible ? "Hide password" : "Show password"} aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff/> : <Eye/>}</button></span>;
}

function NotificationCenter({ notifications, setNotifications, demo }) {
  const markRead = async (notification) => { if (!demo) await request(`/admin/notifications/${notification.id}/read`,{method:"PATCH"}); setNotifications((current) => current.map((item) => item.id === notification.id ? {...item,read_at:new Date().toISOString()} : item)); };
  const readAll = async () => { if (!demo) await request("/admin/notifications/read-all",{method:"POST"}); setNotifications((current) => current.map((item) => ({...item,read_at:item.read_at||new Date().toISOString()}))); };
  return <main className="dashboard"><section className="page-panel"><div className="section-head notification-heading"><div><span><p>Management inbox</p><h2>Notifications</h2></span>{notifications.some((item) => !item.read_at) ? <button type="button" onClick={readAll}><Check/> Mark all read</button> : null}</div></div><div className="notification-list">{notifications.length ? notifications.map((notification) => <article className={notification.read_at ? "read" : "unread"} key={notification.id}><Bell/><div><small>{day(notification.created_at)}</small><h3>{notification.title}</h3><p>{notification.body}</p></div><div>{notification.link ? <a href={notification.link} onClick={() => markRead(notification)}>Open</a> : null}{!notification.read_at ? <button type="button" onClick={() => markRead(notification)}>Mark read</button> : <span>Read</span>}</div></article>) : <div className="empty-row">No notifications yet.</div>}</div></section></main>;
}

function ManagerAdmin({ managers, setManagers, demo }) {
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const invite = async (event) => {
    event.preventDefault(); setMessage(""); setBusy(true);
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form));
    try {
      const manager = demo ? { ...data, id: crypto.randomUUID(), first_name: data.firstName, last_name: data.lastName, role: "staff", status: "active" } : (await request("/admin/managers", { method:"POST", body:JSON.stringify(data) })).manager;
      setManagers((current) => [...current, manager]); form.reset(); setMessage(`${manager.first_name} can now sign in as an account manager.`);
    } catch (cause) { setMessage(cause.message); } finally { setBusy(false); }
  };
  const replacePassword = async (event, manager) => {
    event.preventDefault(); setMessage("");
    const form = event.currentTarget, password = new FormData(form).get("password");
    try { if (!demo) await request(`/admin/managers/${manager.id}/password`, { method:"PATCH", body:JSON.stringify({ password }) }); form.reset(); setMessage(`Password updated for ${manager.first_name}. Their other sessions were signed out.`); }
    catch (cause) { setMessage(cause.message); }
  };
  const setStatus = async (manager, status) => {
    setMessage("");
    try { if (!demo) await request(`/admin/managers/${manager.id}/status`, { method:"PATCH", body:JSON.stringify({ status }) }); setManagers((current) => current.map((item) => item.id === manager.id ? { ...item, status } : item)); setMessage(`${manager.first_name}'s access is now ${status}.`); }
    catch (cause) { setMessage(cause.message); }
  };
  return <main className="dashboard manager-admin"><section className="page-panel">
    <div className="section-head"><p>Administration</p><h2>Account managers</h2></div>
    <div className="manager-intro"><div><ShieldCheck/><span><strong>Owner-controlled access</strong><small>Managers can operate house accounts. Only an owner can invite them, replace passwords, or disable access.</small></span></div></div>
    <form className="manager-invite" onSubmit={invite}>
      <header><div><span>New manager</span><h3>Invite an account manager</h3></div><p>Set their initial password here and provide it to them securely.</p></header>
      <div className="manager-fields"><label><span>First name</span><input name="firstName" required/></label><label><span>Last name</span><input name="lastName" required/></label><label><span>Email address</span><input name="email" type="email" autoComplete="off" required/></label><label><span>Initial password <small>10 characters minimum</small></span><PasswordInput/></label></div>
      <footer><button disabled={busy}>{busy ? "Inviting..." : "Invite manager"}</button></footer>
    </form>
    {message ? <p className="manager-message" role="status">{message}</p> : null}
    <div className="manager-list">{managers.map((manager) => <article className="manager-row" key={manager.id}>
      <div className="manager-identity"><span>{manager.first_name?.[0]}{manager.last_name?.[0]}</span><div><strong>{manager.first_name} {manager.last_name}</strong><small>{manager.email}</small></div></div>
      <div className="manager-meta"><b className={`status ${manager.status}`}>{manager.status}</b><small>{manager.role === "owner" ? "Owner" : "Account manager"}</small></div>
      {manager.role === "staff" ? <><form className="manager-password" onSubmit={(event) => replacePassword(event, manager)}><label><span>New password</span><PasswordInput/></label><button>Update password</button></form><button className={manager.status === "active" ? "manager-disable" : "manager-enable"} type="button" onClick={() => setStatus(manager, manager.status === "active" ? "disabled" : "active")}>{manager.status === "active" ? "Disable access" : "Restore access"}</button></> : <p className="owner-note">Primary account owner</p>}
    </article>)}</div>
  </section></main>;
}

function CareersManager({ careers, setCareers, demo }) {
  const [message, setMessage] = useState("");
  const savePage = async (pageEnabled) => {
    setMessage("");
    try {
      if (!demo) await request("/admin/careers/settings", { method: "PUT", body: JSON.stringify({ pageEnabled }) });
      setCareers((current) => ({ ...current, pageEnabled }));
      setMessage(pageEnabled ? "Careers page is published." : "Careers page is hidden.");
    } catch (cause) { setMessage(cause.message); }
  };
  const addRole = async () => {
    const input = { title: "New position", employmentType: "Full time", shift: "Schedule to be confirmed", blurb: "Add a short description of this position.", responsibilities: ["Add the first responsibility"], sortOrder: (careers.roles.at(-1)?.sort_order || 0) + 10, enabled: false };
    try {
      const role = demo ? { ...input, id: crypto.randomUUID(), employment_type: input.employmentType, sort_order: input.sortOrder } : (await request("/admin/careers/roles", { method: "POST", body: JSON.stringify(input) })).role;
      setCareers((current) => ({ ...current, roles: [...current.roles, role] }));
      setMessage("Position added. Edit it below before publishing.");
    } catch (cause) { setMessage(cause.message); }
  };
  const saveRole = async (event, role) => {
    event.preventDefault(); setMessage("");
    const data = new FormData(event.currentTarget), input = {
      title: data.get("title"), employmentType: data.get("employmentType"), shift: data.get("shift"), blurb: data.get("blurb"),
      responsibilities: String(data.get("responsibilities") || "").split("\n").map((line) => line.trim()).filter(Boolean),
      sortOrder: Number(data.get("sortOrder")), enabled: data.get("enabled") === "on",
    };
    try {
      const updated = demo ? { ...role, ...input, employment_type: input.employmentType } : (await request(`/admin/careers/roles/${role.id}`, { method: "PUT", body: JSON.stringify(input) })).role;
      setCareers((current) => ({ ...current, roles: current.roles.map((item) => item.id === role.id ? updated : item).sort((a,b) => a.sort_order - b.sort_order) }));
      setMessage(`${updated.title} saved.`);
    } catch (cause) { setMessage(cause.message); }
  };
  const removeRole = async (role) => {
    if (!confirm(`Delete ${role.title}? This cannot be undone.`)) return;
    try {
      if (!demo) await request(`/admin/careers/roles/${role.id}`, { method: "DELETE" });
      setCareers((current) => ({ ...current, roles: current.roles.filter((item) => item.id !== role.id) }));
      setMessage(`${role.title} deleted.`);
    } catch (cause) { setMessage(cause.message); }
  };
  return <main className="dashboard careers-manager">
    <section className="page-panel">
      <div className="section-head careers-heading"><div><span><p>Website content</p><h2>Careers</h2></span><button type="button" onClick={addRole}><Plus/> Add position</button></div></div>
      <div className="careers-master"><div><strong>Careers page</strong><span>Hide every opening at once without deleting any positions.</span></div><label className="toggle-field"><input type="checkbox" checked={careers.pageEnabled} onChange={(event) => savePage(event.target.checked)}/><i/><b>{careers.pageEnabled ? "Published" : "Hidden"}</b></label></div>
      {message && <p className="careers-message" role="status">{message}</p>}
      <div className="career-role-list">{careers.roles.map((role) => <form className="career-role-editor" key={role.id} onSubmit={(event) => saveRole(event, role)}>
        <header><div><span>Position</span><h3>{role.title}</h3></div><label className="toggle-field"><input name="enabled" type="checkbox" defaultChecked={role.enabled}/><i/><b>Show on site</b></label></header>
        <div className="career-fields"><label><span>Job title</span><input name="title" defaultValue={role.title} required/></label><label><span>Employment type</span><input name="employmentType" defaultValue={role.employment_type} required/></label><label><span>Shift</span><input name="shift" defaultValue={role.shift} required/></label><label><span>Display order</span><input name="sortOrder" type="number" min="0" step="1" defaultValue={role.sort_order} required/></label><label className="wide"><span>Short description</span><textarea name="blurb" rows="3" defaultValue={role.blurb} required/></label><label className="wide"><span>Responsibilities <small>One per line</small></span><textarea name="responsibilities" rows="5" defaultValue={(role.responsibilities || []).join("\n")} required/></label></div>
        <footer><button className="career-delete" type="button" onClick={() => removeRole(role)}><Trash2/> Delete</button><button type="submit">Save position</button></footer>
      </form>)}</div>
    </section>
  </main>;
}

function Listing({ eyebrow, title, children }) {
  return (
    <main className="dashboard">
      <section className="page-panel">
        <div className="section-head">
          <p>{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {children}
      </section>
    </main>
  );
}
function AccountList({ accounts, account, query, setQuery, setSelected }) {
  return (
    <div className="account-list">
      <div className="section-head">
        <div>
          <p>Portfolio</p>
          <h2>Organizations</h2>
        </div>
        <label className="search">
          <Search />
          <input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      {accounts.map((x) => (
        <button key={x.id} className={x.id === account?.id ? "selected" : ""} onClick={() => setSelected(x.id)}>
          <span className="avatar">{x.organization_name.slice(0, 2).toUpperCase()}</span>
          <span>
            <strong>{x.organization_name}</strong>
            <small>{x.account_code_hint || x.billing_email}</small>
          </span>
          <b>{cash(x.credit?.balance || x.credit?.postedBalance, x.currency)}</b>
        </button>
      ))}
      {!accounts.length ? <div className="empty-row">No organizations found.</div> : null}
    </div>
  );
}

function Applications({ applications, setApplications, setAccounts, accounts, demo }) {
  const [selected, setSelected] = useState(applications.find((x) => x.status === "pending")?.id || applications[0]?.id),
    application = applications.find((x) => x.id === selected) || applications[0];
  return (
    <main className="dashboard">
      <section className="request-layout">
        <div className="request-list">
          <div className="section-head">
            <p>Credit review</p>
            <h2>House-account applications</h2>
          </div>
          {applications.map((x) => (
            <button key={x.id} className={x.id === application?.id ? "selected" : ""} onClick={() => setSelected(x.id)}>
              <span>
                <strong>{x.organization_name}</strong>
                <small>
                  {x.contact_name} · {day(x.created_at)}
                </small>
              </span>
              <em className={`status ${x.status}`}>{x.status}</em>
            </button>
          ))}
          {!applications.length ? <div className="empty-row">No house-account applications yet.</div> : null}
        </div>
        {application ? (
          <HouseApplicationDetail
            application={application}
            demo={demo}
            onReviewed={({ application: next, account, accountCode }) => {
              setApplications(applications.map((x) => (x.id === next.id ? next : x)));
              if (account) setAccounts([account, ...accounts]);
              if (accountCode) alert(`Approved. House account code: ${accountCode}\n\nRecord this code now; it is only shown once.`);
            }}
          />
        ) : (
          <div className="empty">Select an application to review it.</div>
        )}
      </section>
    </main>
  );
}

function HouseApplicationDetail({ application, demo, onReviewed }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const review = async (status, form) => {
    if (demo) return;
    setBusy(true);
    setError("");
    const data = new FormData(form);
    try {
      onReviewed(
        await request(`/admin/applications/${application.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status,
            reviewNotes: data.get("reviewNotes"),
            creditLimit: Math.round(Number(data.get("creditLimit") || 0) * 100),
            paymentTermsDays: Number(data.get("terms") || 30),
          }),
        }),
      );
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="application-detail">
      <div className="account-title">
        <div>
          <p>{application.organization_type}</p>
          <h2>{application.organization_name}</h2>
          <span>
            {application.contact_name} · <a href={`mailto:${application.email}`}>{application.email}</a>
            {application.phone ? ` · ${application.phone}` : ""}
          </span>
        </div>
        <span className={`status ${application.status}`}>{application.status}</span>
      </div>
      <dl className="request-facts">
        <div>
          <dt>Requested credit</dt>
          <dd>{cash(application.requested_credit_limit || 0)}</dd>
        </div>
        <div>
          <dt>Expected order</dt>
          <dd>{cash(application.estimated_order_total || 0)}</dd>
        </div>
        <div><dt>Billing frequency</dt><dd>{application.billing_frequency || "Monthly"}</dd></div>
        <div><dt>Invoice email</dt><dd><a href={`mailto:${application.invoice_email || application.email}`}>{application.invoice_email || application.email}</a></dd></div>
      </dl>
      <div className="request-notes authorized-review"><strong>Authorized purchasers</strong>{application.authorized_purchasers?.length ? <ul>{application.authorized_purchasers.map((person,index) => <li key={`${person.email}-${index}`}><b>{person.name}</b><span>{person.organizationRole} · {person.email}</span></li>)}</ul> : <p>No additional purchasers requested.</p>}</div>
      <div className="request-notes">
        <strong>Applicant notes</strong>
        <p>{application.notes || "No additional notes."}</p>
      </div>
      {application.status === "pending" ? (
        <form
          className="review-form"
          onSubmit={(event) => {
            event.preventDefault();
            review("approved", event.currentTarget);
          }}
        >
          <label>
            <span>Credit limit</span>
            <input name="creditLimit" type="number" min="0" step=".01" defaultValue={Number(application.requested_credit_limit || 100000) / 100} required />
          </label>
          <label>
            <span>Terms</span>
            <select name="terms" defaultValue="30">
              <option value="0">Due now</option>
              <option value="15">Net 15</option>
              <option value="30">Net 30</option>
              <option value="45">Net 45</option>
              <option value="60">Net 60</option>
            </select>
          </label>
          <label className="review-notes">
            <span>Internal review note</span>
            <textarea name="reviewNotes" rows="3" placeholder="Reason, conditions, or follow-up details" />
          </label>
          {error ? <p className="error review-error">{error}</p> : null}
          <div className="review-actions">
            <button type="button" className="reject" disabled={busy} onClick={(event) => review("rejected", event.currentTarget.form)}>
              {busy ? "Working..." : "Reject"}
            </button>
            <button disabled={busy}>{busy ? "Working..." : "Approve account"}</button>
          </div>
        </form>
      ) : (
        <div className="reviewed">
          <strong>{application.status}</strong>
          <p>{application.review_notes || "No internal review note."}</p>
        </div>
      )}
    </article>
  );
}

function BulkRequests({ requests, setRequests, demo }) {
  const [selected, setSelected] = useState(requests.find((x) => x.status === "pending")?.id || requests[0]?.id),
    item = requests.find((x) => x.id === selected) || requests[0];
  return (
    <main className="dashboard">
      <section className="request-layout">
        <div className="request-list">
          <div className="section-head">
            <p>Production inquiries</p>
            <h2>Bulk-order requests</h2>
          </div>
          {requests.map((x) => (
            <button key={x.id} className={x.id === item?.id ? "selected" : ""} onClick={() => setSelected(x.id)}>
              <span>
                <strong>{x.organization_name}</strong>
                <small>
                  {x.contact_name} · {day(x.needed_for)}
                </small>
              </span>
              <em className={`status ${x.status}`}>{x.status}</em>
            </button>
          ))}
          {!requests.length ? <div className="empty-row">No bulk-order requests yet.</div> : null}
        </div>
        {item ? <BulkRequestDetail item={item} demo={demo} onReviewed={(next) => setRequests(requests.map((x) => (x.id === next.id ? next : x)))} /> : <div className="empty">Select a bulk request to review it.</div>}
      </section>
    </main>
  );
}

function BulkRequestDetail({ item, demo, onReviewed }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const review = async (status, form) => {
    if (demo) return;
    setBusy(true);
    setError("");
    const data = new FormData(form);
    try {
      onReviewed(
        (
          await request(`/admin/bulk-requests/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              status,
              reviewNotes: data.get("reviewNotes"),
            }),
          })
        ).request,
      );
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="application-detail">
      <div className="account-title">
        <div>
          <p>{item.organization_type}</p>
          <h2>{item.organization_name}</h2>
          <span>
            {item.contact_name} · <a href={`mailto:${item.email}`}>{item.email}</a>
            {item.phone ? ` · ${item.phone}` : ""}
          </span>
        </div>
        <span className={`status ${item.status}`}>{item.status}</span>
      </div>
      <dl className="request-facts">
        <div>
          <dt>Needed for</dt>
          <dd>{day(item.needed_for)}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{item.head_count || "Not specified"}</dd>
        </div>
        <div>
          <dt>Fulfillment</dt>
          <dd>{item.fulfillment}</dd>
        </div>
        <div>
          <dt>Products</dt>
          <dd>{(item.products || []).join(", ")}</dd>
        </div>
      </dl>
      <div className="request-notes">
        <strong>Customer notes</strong>
        <p>{item.notes || "No additional notes."}</p>
      </div>
      {item.status === "pending" ? (
        <form
          className="review-form"
          onSubmit={(event) => {
            event.preventDefault();
            review("approved", event.currentTarget);
          }}
        >
          <label className="review-notes">
            <span>Internal review note</span>
            <textarea name="reviewNotes" rows="3" placeholder="Availability, quote status, or follow-up details" />
          </label>
          {error ? <p className="error review-error">{error}</p> : null}
          <div className="review-actions">
            <button type="button" className="reject" disabled={busy} onClick={(event) => review("rejected", event.currentTarget.form)}>
              {busy ? "Working..." : "Reject"}
            </button>
            <button disabled={busy}>{busy ? "Working..." : "Approve request"}</button>
          </div>
        </form>
      ) : (
        <div className="reviewed">
          <strong>{item.status}</strong>
          <p>{item.review_notes || "No internal review note."}</p>
        </div>
      )}
    </article>
  );
}

function ApplicationDetail({ application, demo, onReviewed }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const review = async (status, form) => {
    if (demo) return;
    setBusy(true);
    setError("");
    const data = new FormData(form);
    try {
      onReviewed(
        await request(`/admin/applications/${application.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status,
            reviewNotes: data.get("reviewNotes"),
            creditLimit: Math.round(Number(data.get("creditLimit") || 0) * 100),
            paymentTermsDays: Number(data.get("terms") || 30),
          }),
        }),
      );
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="application-detail">
      <div className="account-title">
        <div>
          <p>{application.organization_type}</p>
          <h2>{application.organization_name}</h2>
          <span>
            {application.contact_name} · <a href={`mailto:${application.email}`}>{application.email}</a>
            {application.phone ? ` · ${application.phone}` : ""}
          </span>
        </div>
        <span className={`status ${application.status}`}>{application.status}</span>
      </div>
      <dl className="request-facts">
        <div>
          <dt>Needed for</dt>
          <dd>{day(application.needed_for)}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{application.head_count || "Not specified"}</dd>
        </div>
        <div>
          <dt>Fulfillment</dt>
          <dd>{application.fulfillment}</dd>
        </div>
        <div>
          <dt>Products</dt>
          <dd>{(application.products || []).join(", ")}</dd>
        </div>
      </dl>
      <div className="request-notes">
        <strong>Customer notes</strong>
        <p>{application.notes || "No additional notes."}</p>
      </div>
      {application.status === "pending" ? (
        <form
          className="review-form"
          onSubmit={(e) => {
            e.preventDefault();
            review("approved", e.currentTarget);
          }}
        >
          <label>
            <span>Credit limit</span>
            <input name="creditLimit" type="number" min="0" step=".01" defaultValue="1000" required />
          </label>
          <label>
            <span>Terms</span>
            <select name="terms" defaultValue="30">
              <option value="0">Due now</option>
              <option value="15">Net 15</option>
              <option value="30">Net 30</option>
              <option value="45">Net 45</option>
              <option value="60">Net 60</option>
            </select>
          </label>
          <label className="review-notes">
            <span>Internal review note</span>
            <textarea name="reviewNotes" rows="3" placeholder="Reason, conditions, or follow-up details" />
          </label>
          {error ? <p className="error review-error">{error}</p> : null}
          <div className="review-actions">
            <button type="button" className="reject" disabled={busy} onClick={(e) => review("rejected", e.currentTarget.form)}>
              {busy ? "Working..." : "Reject"}
            </button>
            <button disabled={busy}>{busy ? "Working..." : "Approve account"}</button>
          </div>
        </form>
      ) : (
        <div className="reviewed">
          <strong>{application.status}</strong>
          <p>{application.review_notes || "No internal review note."}</p>
        </div>
      )}
    </article>
  );
}

function Customer({ account, view }) {
  if (!account)
    return (
      <main className="dashboard">
        <div className="empty">No house account is linked to this login.</div>
      </main>
    );
  if (view === "statements")
    return (
      <Listing eyebrow="Billing" title="Your statements">
        <StatementTable statements={account.statements} />
      </Listing>
    );
  if (view === "orders")
    return (
      <Listing eyebrow="Order history" title="Your orders">
        <OrderTable orders={account.orders} />
      </Listing>
    );
  return (
    <main className="dashboard">
      <section className="metrics">
        <Metric label="Balance due" value={cash(account.credit.balance || account.credit.postedBalance, account.currency)} note={`Net ${account.payment_terms_days}`} tone="magenta" />
        <Metric label="Available credit" value={cash(account.credit.available, account.currency)} note={`Limit ${cash(account.credit.creditLimit, account.currency)}`} tone="green" />
        <Metric label="Reserved" value={cash(account.credit.reserved, account.currency)} note="Pending orders" tone="yellow" />
      </section>
      <AccountDetail account={account} />
    </main>
  );
}
function Metric({ label, value, note, tone }) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
function AccountDetail({ account, staff, demo }) {
  const [tab, setTab] = useState("activity"),
    used = Number(account.credit.balance || account.credit.postedBalance || 0),
    limit = Number(account.credit.creditLimit || 0),
    percent = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <article className="account-detail">
      <div className="account-title">
        <div>
          <p>{account.account_code_hint || "House account"}</p>
          <h2>{account.organization_name}</h2>
          <span>
            {account.billing_contact} · {account.billing_email}
          </span>
        </div>
        <span className={`status ${account.status}`}>{account.status}</span>
      </div>
      <div className="credit-track">
        <div>
          <span>Credit used</span>
          <strong>
            {cash(used, account.currency)} <small>of {cash(limit, account.currency)}</small>
          </strong>
        </div>
        <div className="track">
          <i style={{ width: `${percent}%` }} />
        </div>
        <p>
          {cash(account.credit.available, account.currency)} available · {cash(account.credit.reserved, account.currency)} reserved
        </p>
      </div>
      {staff ? (
        <section className="settings-section billing-settings">
          <header><div><span>Account settings</span><h3>Credit & billing</h3></div><p>Control the approved balance, payment terms, and statement schedule.</p></header>
        <form
          className="settings-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            if (demo) return;
            const d = new FormData(e.currentTarget);
            await request(`/admin/accounts/${account.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                status: d.get("status"),
                creditLimit: Math.round(Number(d.get("limit")) * 100),
                paymentTermsDays: Number(d.get("terms")),
                billingFrequency: d.get("billingFrequency"),
                autoChargeStatements: d.get("autoChargeStatements") === "on",
                periodSpendLimit: d.get("periodSpendLimit") ? Math.round(Number(d.get("periodSpendLimit")) * 100) : null,
                periodSpendFrequency: d.get("periodSpendFrequency"),
                organizationPin: d.get("organizationPin"),
              }),
            });
          }}
        >
          <label>
            <span>Status</span>
            <select name="status" defaultValue={account.status}>
              <option>active</option>
              <option>pending</option>
              <option>suspended</option>
              <option>closed</option>
            </select>
          </label>
          <label>
            <span>Credit limit</span>
            <div className="money-input"><span aria-hidden="true">$</span><input name="limit" type="number" min="0" step=".01" defaultValue={limit / 100} /></div>
          </label>
          <label>
            <span>Terms</span>
            <select name="terms" defaultValue={account.payment_terms_days}>
              <option value="0">Due now</option>
              <option value="15">Net 15</option>
              <option value="30">Net 30</option>
              <option value="45">Net 45</option>
              <option value="60">Net 60</option>
            </select>
          </label>
          <label>
            <span>Recurring invoice</span>
            <select name="billingFrequency" defaultValue={account.billing_frequency || "manual"}>
              <option value="manual">Manual</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label>
            <span>Automatic collection</span>
            <span className="toggle-field"><input type="checkbox" name="autoChargeStatements" defaultChecked={account.auto_charge_statements} /><i/><b>Charge saved card when due</b></span>
          </label>
          <label>
            <span>Period spending cap <small>Optional</small></span>
            <div className="money-input"><span aria-hidden="true">$</span><input name="periodSpendLimit" type="number" min="0.01" step=".01" placeholder="No limit" defaultValue={account.period_spend_limit ? Number(account.period_spend_limit) / 100 : ""} /></div>
          </label>
          <label>
            <span>Cap period</span>
            <select name="periodSpendFrequency" defaultValue={account.period_spend_frequency || "monthly"}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
          </label>
          <label>
            <span>Reset organization PIN <small>Optional</small></span>
            <input name="organizationPin" type="password" inputMode="numeric" pattern="[0-9]{4,8}" minLength="4" maxLength="8" placeholder="Leave unchanged" />
          </label>
          <div className="form-actions"><button>Save billing settings</button></div>
        </form>
        </section>
      ) : null}
      {staff ? <AdminCardManager account={account} demo={demo} /> : null}
      {staff ? <AccountMemberForm account={account} /> : null}
      <nav className="detail-tabs">
        <button className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}>
          Activity
        </button>
        <button className={tab === "statements" ? "active" : ""} onClick={() => setTab("statements")}>
          Statements
        </button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
          Orders
        </button>
      </nav>
      {tab === "activity" ? <Activity entries={account.ledger} account={account} staff={staff} demo={demo} /> : tab === "statements" ? <Statements account={account} staff={staff} demo={demo} /> : <OrderTable orders={account.orders} />}
    </article>
  );
}
function AdminCardManager({ account, demo }) {
  const activeCard = account.cards?.find((card) => card.status === "active"), card = useRef(null);
  const [editing, setEditing] = useState(false), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const fieldId = `admin-square-card-${account.id}`;
  useEffect(() => {
    if (!editing || demo) return;
    let cancelled = false;
    const mount = async () => {
      const config = await request("/storefront/config");
      if (!window.Square) {
        const script = document.createElement("script");
        script.src = config.environment === "sandbox" ? "https://sandbox.web.squarecdn.com/v1/square.js" : "https://web.squarecdn.com/v1/square.js";
        script.async = true;
        await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = () => reject(new Error("Secure card fields could not load.")); document.head.appendChild(script); });
      }
      if (cancelled || !window.Square) return;
      card.current = await window.Square.payments(config.applicationId, config.locationId).card();
      await card.current.attach(`#${fieldId}`);
      setReady(true);
    };
    void mount().catch((cause) => setError(cause.message));
    return () => { cancelled = true; setReady(false); void card.current?.destroy().catch(() => {}); card.current = null; };
  }, [editing, demo, fieldId]);
  return (
    <section className="settings-section card-settings">
      <header><div><span>Payment method</span><h3>Card on file</h3></div><p>Enter the card here. Card details are sent directly to Square and never stored on this website.</p></header>
      <div className="card-status"><div><CreditCard/><span><strong>{activeCard ? `${activeCard.card_brand || "Card"} ending ${activeCard.last_4}` : "No active card"}</strong><small>{activeCard ? "Available for authorized statement collection" : "Credit checkout remains unavailable until a card is saved"}</small></span></div><div className="card-actions">
        <button className="primary-button" type="button" onClick={() => { setEditing(true); setMessage(""); setError(""); }}>{activeCard ? "Replace card" : "Add card"}</button>
        <button className="secondary-button" type="button" onClick={async()=>{try{await request(`/admin/accounts/${account.id}/card/replacement`,{method:"POST"});setMessage("Secure card link emailed to the account contact.");}catch(cause){setError(cause.message);}}}>Email secure link</button>
        {activeCard ? <button className="text-button danger-button" type="button" onClick={async()=>{if(confirm("Disable the active card? Credit checkout and automatic collection will stop.")){await request(`/admin/accounts/${account.id}/card/disable`,{method:"POST"});location.reload();}}}>Disable card</button> : null}
      </div></div>
      {editing ? <form className="admin-card-entry" onSubmit={async(event)=>{event.preventDefault();setBusy(true);setError("");setMessage("");try{if(demo){setMessage("Demo card saved.");setEditing(false);return;}if(!card.current)throw new Error("The secure card form is still loading.");const data=new FormData(event.currentTarget),token=await card.current.tokenize({intent:"STORE",customerInitiated:false,sellerKeyedIn:true,billingContact:{givenName:String(data.get("cardholderName")||account.billing_contact||account.organization_name),email:account.billing_email}});if(token.status!=="OK"||!token.token)throw new Error(token.errors?.[0]?.message||"Card authorization failed.");await request(`/admin/accounts/${account.id}/card`,{method:"POST",body:JSON.stringify({sourceId:token.token,cardholderName:data.get("cardholderName"),authorizationConfirmed:data.get("authorizationConfirmed")==="on"})});location.reload();}catch(cause){setError(cause.message);}finally{setBusy(false);}}}>
        <label><span>Cardholder name</span><input name="cardholderName" required minLength="2" defaultValue={account.billing_contact||account.organization_name}/></label>
        <div className="square-card-field"><span>Card details</span><div id={fieldId}>{demo ? <p>Secure Square card field</p> : null}</div>{!ready&&!demo?<small>Loading secure card field...</small>:null}</div>
        <label className="card-authorization"><input type="checkbox" name="authorizationConfirmed" required/><span>I confirm the customer authorized Amazing Donuts to store this card and charge approved statements.</span></label>
        <div className="card-entry-actions"><button disabled={busy||(!ready&&!demo)}>{busy?"Saving...":activeCard?"Save replacement card":"Save card"}</button><button className="secondary-button" type="button" onClick={()=>setEditing(false)}>Cancel</button></div>
      </form> : null}
      {message ? <p className="card-message success">{message}</p> : null}{error ? <p className="card-message error">{error}</p> : null}
    </section>
  );
}
function AccountMemberForm({ account }) {
  const initialType = organizationRoles[account.metadata?.organizationType] ? account.metadata.organizationType : "Other business";
  const [organizationType, setOrganizationType] = useState(initialType);
  const roles = organizationRoles[organizationType];
  return (
    <section className="settings-section team-settings">
      <header><div><span>Access</span><h3>Team members</h3></div><p>Add an existing website customer and control what they can do.</p></header>
    <form
      className="settings-grid team-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        await request(`/admin/accounts/${account.id}/purchasers`, { method: "POST", body: JSON.stringify({ email: data.get("email"), organizationType, organizationRole: data.get("organizationRole"), role: data.get("role"), purchaseLimit: data.get("purchaseLimit") ? Math.round(Number(data.get("purchaseLimit")) * 100) : null, pin:data.get("pin") }) });
        location.reload();
      }}
    >
      <label>
        <span><i className="step-number">1</i> Organization type</span>
        <select value={organizationType} onChange={(event) => setOrganizationType(event.target.value)}>
          {Object.keys(organizationRoles).map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
      <label>
        <span><i className="step-number">2</i> Member role</span>
        <select name="organizationRole">
          {roles.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="member-email">
        <span>Member email</span>
        <input name="email" type="email" placeholder="name@organization.com" required />
      </label>
      <label>
        <span>Access level</span>
        <select name="role">
          <option value="account_admin">Administrator</option>
          <option value="purchaser">Purchaser</option>
          <option value="viewer">Viewer</option>
        </select>
      </label>
      <label>
        <span>Per-order limit <small>Optional</small></span>
        <input name="purchaseLimit" type="number" min="0" step="1" placeholder="No limit" />
      </label>
      <label>
        <span>Personal PIN</span>
        <input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,8}" minLength="4" maxLength="8" required />
      </label>
      <div className="form-actions"><button>Add team member</button></div>
    </form>
    </section>
  );
}
function Activity({ entries = [], account, staff, demo }) {
  return (
    <>
      {staff ? (
        <details className="ledger-tools">
          <summary>Post a manual adjustment</summary>
        <form
          className="settings-grid ledger-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            if (demo) return;
            const form = e.currentTarget,
              d = new FormData(form);
            await request(`/admin/accounts/${account.id}/ledger`, {
              method: "POST",
              body: JSON.stringify({
                type: d.get("type"),
                amount: Math.round(Number(d.get("amount")) * 100),
                description: d.get("description"),
                direction: d.get("direction"),
              }),
            });
            location.reload();
          }}
        >
          <label>
            <span>Entry type</span>
            <select name="type">
              <option value="payment">Payment</option>
              <option value="credit">Credit</option>
              <option value="adjustment">Adjustment</option>
              <option value="refund">Refund</option>
              <option value="write_off">Write-off</option>
            </select>
          </label>
          <label>
            <span>Direction</span>
            <select name="direction">
              <option value="credit">Reduce balance</option>
              <option value="debit">Increase balance</option>
            </select>
          </label>
          <label>
            <span>Amount</span>
            <input name="amount" type="number" min="0.01" step="0.01" required />
          </label>
          <label>
            <span>Description</span>
            <input name="description" required />
          </label>
          <div className="form-actions"><button>Post entry</button></div>
        </form>
        </details>
      ) : null}
      <div className="table">
        <div className="table-head">
          <span>Date</span>
          <span>Description</span>
          <span>Type</span>
          <span>Amount</span>
        </div>
        {entries.length ? (
          entries.map((x) => (
            <div className="table-row" key={x.id}>
              <span>{day(x.effective_at)}</span>
              <strong>{x.description}{x.purchaser_first_name || x.purchaser_email ? <small className="purchaser-attribution">Purchased by {x.purchaser_first_name ? `${x.purchaser_first_name} ${x.purchaser_last_name || ""}`.trim() : x.purchaser_email}</small> : null}</strong>
              <em>{x.transaction_type}</em>
              <b className={Number(x.amount) < 0 ? "credit" : ""}>
                {cash(x.amount, x.currency)}
                {staff && x.transaction_type !== "reversal" ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const reason = prompt("Reason for reversal");
                      if (!reason) return;
                      await request(`/admin/accounts/${account.id}/reversals`, {
                        method: "POST",
                        body: JSON.stringify({ transactionId: x.id, reason }),
                      });
                      location.reload();
                    }}
                  >
                    Reverse
                  </button>
                ) : null}
              </b>
            </div>
          ))
        ) : (
          <div className="empty-row">No account activity yet.</div>
        )}
      </div>
    </>
  );
}
function OrderTable({ orders = [] }) {
  const [expanded, setExpanded] = useState([]);
  const toggle = (id) => setExpanded((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  return (
    <div className="table order-table">
      <div className="table-head order-summary-grid">
        <span>Date</span>
        <span>Order</span>
        <span>Channel</span>
        <span>Total</span>
        <span aria-hidden="true" />
      </div>
      {orders.length ? (
        orders.map((x) => {
          const isOpen = expanded.includes(x.id), items = Array.isArray(x.line_items) ? x.line_items : [];
          return <div className={`order-record${isOpen ? " expanded" : ""}`} key={x.id}>
            <button className="table-row order-summary-grid" type="button" aria-expanded={isOpen} onClick={() => toggle(x.id)}>
              <span>{day(x.ordered_at)}</span>
              <strong>
                {x.organization_name || x.email || `#${x.receipt_number || String(x.square_order_id || x.id).slice(-8)}`}
                {x.purchaser_first_name || x.purchaser_email || x.email ? <small className="purchaser-attribution">Purchased by {x.purchaser_first_name ? `${x.purchaser_first_name} ${x.purchaser_last_name || ""}`.trim() : x.purchaser_email || x.email}</small> : null}
              </strong>
              <em>{x.source}</em>
              <b>{cash(x.total, x.currency)}</b>
              <ChevronDown className="order-chevron" />
            </button>
            {isOpen ? <div className="order-items">
              <div className="order-items-head"><span>Menu item</span><span>Qty</span><span>Amount</span></div>
              {items.length ? items.map((item, index) => <div className="order-item" key={item.uid || item.catalog_object_id || index}>
                <span><strong>{item.name || "Menu item"}</strong>{item.variation_name ? <small>{item.variation_name}</small> : null}</span>
                <span>{item.quantity || 1}</span>
                <b>{cash(item.total_money?.amount ?? Number(item.base_price_money?.amount || 0) * Number(item.quantity || 1), item.total_money?.currency || item.base_price_money?.currency || x.currency)}</b>
              </div>) : <p>No item details were stored for this order.</p>}
              {x.assets?.length ? <div className="order-assets">{x.assets.map((asset) => <a key={asset.id} href={`/api/house/custom-assets/${asset.id}`}><Download /> {asset.fileName}</a>)}</div> : null}
            </div> : null}
          </div>
        })
      ) : (
        <div className="empty-row">No orders yet.</div>
      )}
    </div>
  );
}
function StatementTable({ statements = [] }) {
  return (
    <div className="table statement-table">
      <div className="table-head statement-grid">
        <span>Period</span>
        <span>Statement</span>
        <span>Status</span>
        <span>Amount</span>
        <span className="visually-hidden">Download</span>
      </div>
      {statements.length ? (
        statements.map((x) => (
          <a className="table-row statement-grid" key={x.id} href={`/api/house/statements/${x.id}.pdf`} target="_blank" rel="noreferrer">
            <span>{day(x.period_end)}</span>
            <strong>
              <FileText /> {x.organization_name || x.statement_number}
            </strong>
            <em>{x.status}</em>
            <b>{cash(x.closing_balance, x.currency)}</b>
            <span className="statement-download" aria-label={`Download ${x.organization_name || x.statement_number}`}><Download /></span>
          </a>
        ))
      ) : (
        <div className="empty-row">No statements issued yet.</div>
      )}
    </div>
  );
}
function PurchaserTable({ purchasers = [] }) {
  return (
    <div className="table">
      <div className="table-head">
        <span>Organization</span>
        <span>Purchaser</span>
        <span>Role</span>
        <span>Limit</span>
      </div>
      {purchasers.length ? (
        purchasers.map((x) => (
          <div className="table-row" key={`${x.organization_name}-${x.id}`}>
            <span>{x.organization_name}</span>
            <strong>
              {x.first_name} {x.last_name}
            </strong>
            <em>{x.role.replaceAll("_", " ")}</em>
            <b>{x.purchase_limit == null ? "No limit" : cash(x.purchase_limit)}</b>
          </div>
        ))
      ) : (
        <div className="empty-row">No purchasers have been added yet.</div>
      )}
    </div>
  );
}
const localIsoDate = (value) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const date = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
};
function StatementDateRange({ disabled }) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState(undefined);
  const selectionRef = useRef(undefined);
  const [hoveredDay, setHoveredDay] = useState(undefined);
  const [displayMonth, setDisplayMonth] = useState(() => new Date());
  const [preset, setPreset] = useState("");
  const [calendarRevision, setCalendarRevision] = useState(0);
  const from = selection?.from ? localIsoDate(selection.from) : "";
  const through = selection?.to ? localIsoDate(selection.to) : "";
  const range = from && through ? `${from} - ${through}` : from ? `${from} - Select end date` : "";
  const applyPreset = (id, months, days) => {
    const end = new Date();
    const start = new Date(end);
    if (days) start.setDate(start.getDate() - days + 1);
    if (months) start.setMonth(start.getMonth() - months);
    const next = { from: start, to: end };
    selectionRef.current = next;
    setSelection(next);
    setDisplayMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setHoveredDay(undefined);
    setPreset(id);
    setCalendarRevision((value) => value + 1);
  };
  const clearSelection = () => {
    selectionRef.current = undefined;
    setSelection(undefined);
    setHoveredDay(undefined);
    setPreset("");
    setDisplayMonth(new Date());
    setCalendarRevision((value) => value + 1);
  };
  const selectDay = (date) => {
    setPreset("");
    setHoveredDay(undefined);
    const next = nextDateRangeSelection(selectionRef.current, date);
    selectionRef.current = next;
    setSelection(next);
    if (!next.to) setDisplayMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };
  const choosingEnd = Boolean(selection?.from && !selection.to);
  return (
    <div className="date-range-field">
      <span className="field-label">Statement period</span>
      <label className="date-range-input">
        <CalendarRange />
        <input name="range" value={range} readOnly disabled={disabled} aria-expanded={open} aria-label="Statement period" placeholder="Select a date range" onClick={() => setOpen(true)} onFocus={() => setOpen(true)} />
      </label>
      {open ? (
        <div className="date-range-panel">
          <div className="range-presets" aria-label="Statement period presets">
            {[["30d", "30 days", 0, 30], ["2m", "2 months", 2, 0], ["3m", "3 months", 3, 0], ["6m", "6 months", 6, 0], ["12m", "12 months", 12, 0]].map(([id, label, months, days]) => (
              <button className={preset === id ? "active" : ""} type="button" key={id} onClick={() => applyPreset(id, months, days)}>{label}</button>
            ))}
          </div>
          <DayPicker
            key={calendarRevision}
            mode="range"
            selected={selection}
            onDayClick={selectDay}
            onDayMouseEnter={(date) => setHoveredDay(date)}
            onDayMouseLeave={() => setHoveredDay(undefined)}
            modifiers={{
              rangeReset: (date) => choosingEnd && date < selection.from,
              rangePreview: (date) => choosingEnd && hoveredDay >= selection.from && date > selection.from && date <= hoveredDay,
            }}
            modifiersClassNames={{ rangeReset: "range-reset-day", rangePreview: "range-preview-day" }}
            numberOfMonths={2}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            showOutsideDays
            disabled={{ after: new Date() }}
          />
          <div className="range-actions">
            <button className="range-clear" type="button" disabled={!from} onClick={clearSelection}>Clear</button>
            <button className="range-done" type="button" disabled={!from || !through} onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
function Statements({ account, staff, demo }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const openStatement = account.statements.find((statement) => !["paid", "void"].includes(statement.status));
  const paymentLink = openStatement?.payment_token ? `${location.origin}/account/?statement=${openStatement.payment_token}` : "";
  const issue = async (event) => {
    event.preventDefault();
    if (demo) return;
    const data = new FormData(event.currentTarget);
    const range = String(data.get("range") || "").match(/^\s*(\d{4}-\d{2}-\d{2})\s*(?:-|–|to)\s*(\d{4}-\d{2}-\d{2})\s*$/i);
    if (!range || range[1] > range[2]) {
      setError("Choose a statement period before issuing the invoice.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const scheduled = data.get("scheduledChargeAt");
      const { statement } = await request(`/admin/accounts/${account.id}/statements`, {
        method: "POST",
        body: JSON.stringify({
          periodStart: range[1],
          periodEnd: range[2],
          ...(scheduled ? { scheduledChargeAt: new Date(String(scheduled)).toISOString() } : {}),
        }),
      });
      await downloadStatement(statement);
      location.reload();
    } catch (cause) {
      setError(cause.message);
      setBusy(false);
    }
  };
  return (
    <div className="statements">
      <StatementTable statements={account.statements} />
      {staff && openStatement ? (
        <div className="statement-actions">
          <button
            type="button"
            onClick={async () => {
              await request(`/admin/statements/${openStatement.id}/charge`, {
                method: "POST",
                body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
              });
              location.reload();
            }}
          >
            Charge saved card
          </button>
          <button
            className="text-button"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(paymentLink);
              alert("Payment link copied.");
            }}
            disabled={!paymentLink}
          >
            <Copy /> Copy payment link
          </button>
        </div>
      ) : null}
      {staff ? (
        <form className="issue" onSubmit={issue}>
          <div>
            <ReceiptText />
            <span>
              <strong>Create an invoice</strong>
              <small>Issue a statement now, or schedule its saved-card collection.</small>
            </span>
          </div>
          <StatementDateRange disabled={busy} />
          <label>
            <span>Scheduled payment</span>
            <input type="datetime-local" name="scheduledChargeAt" disabled={busy} />
          </label>
          {error ? <p className="error review-error">{error}</p> : null}
          <button disabled={busy}>{busy ? "Creating PDF..." : "Issue invoice"}</button>
        </form>
      ) : null}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);

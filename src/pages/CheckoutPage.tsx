import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  LockKeyhole,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import { ShopProvider, money, useShop, lineKeyOf } from "../lib/shop";
import AuthModal from "../shop/AuthModal";
import CommerceLogo from "./CommerceLogo";
import "../index.css";
import "../components/brand/brand.css";
import "../shop/shop.css";
import "./commerce.css";
import "./delivery.css";
import {
  customizationComplete,
  PRINT_PRODUCTS,
  type Customization,
} from "../lib/custom-order";
import CheckoutFix from "../shop/CheckoutFix";
import BrandDatePicker from "../components/BrandDatePicker";
import BrandTimePicker from "../components/BrandTimePicker";
import AddressAutocomplete, {
  type Address,
  type SavedAddress,
} from "../components/AddressAutocomplete";
import { formatNorthAmericanPhone, isValidNorthAmericanPhone } from "../lib/phone";
/* The counter's hours and the label format live in `lib/pickup` rather than
   here, because the band on every shopping page reads them too. Two copies of
   a bakery's opening hours is a wrong answer waiting for the first change to
   either.

   This page is now where the pickup appointment is actually made. It used to
   be asked on a gate between the homepage and the catalogue, before there was
   a bag to collect; the schedule block below is that questionnaire, and when
   pickup is the answer it says which counter the order is being collected
   from. */
import {
  clearPickup,
  HOURS_SUMMARY,
  PICKUP_HOURS,
  readPickup,
  SLOT_MINUTES,
  timeLabel,
} from "../lib/pickup";
import { SHOP_ADDRESS } from "../lib/routes";
import {
  readFulfillmentPreference,
  writeFulfillmentPreference,
} from "../lib/fulfillment";
type Session = {
  user: null | { firstName: string; lastName: string; email: string };
  profile: null | {
    default_phone?: string;
    default_address?: Partial<Address>;
  };
  houseAccount: null | {
    id: string;
    organizationName: string;
    status: string;
    credit: { available: number };
    creditEnabled: boolean;
    card?: { brand?: string; last4?: string };
  };
};
let squareScriptPromise: Promise<void> | undefined;
const ensureSquare = (environment: string) => {
  if (window.Square) return Promise.resolve();
  if (!squareScriptPromise)
    squareScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        "script[data-amazing-square]",
      );
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Secure payment options could not load.")),
          { once: true },
        );
        return;
      }
      const script = document.createElement("script");
      script.dataset.amazingSquare = "true";
      script.src =
        environment === "sandbox"
          ? "https://sandbox.web.squarecdn.com/v1/square.js"
          : "https://web.squarecdn.com/v1/square.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Secure payment options could not load."));
      document.head.appendChild(script);
    });
  return squareScriptPromise;
};
const blankAddress: Address = {
  addressLine1: "",
  addressLine2: "",
  locality: "Toronto",
  administrativeDistrictLevel1: "ON",
  postalCode: "",
  country: "CA",
};
const DEFAULT_SCHEDULE = {
  intervalMinutes: 30,
  deliveryStart: 6 * 60 + 30,
  deliveryEnd: 16 * 60 + 30,
};
const torontoISOString = (value: string) => {
  const [date, time] = value.split("T"),
    [year, month, day] = date.split("-").map(Number),
    [hour, minute] = time.split(":").map(Number),
    wallClock = Date.UTC(year, month - 1, day, hour, minute),
    probe = new Date(wallClock),
    parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(probe)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    ),
    offset =
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
      ) - wallClock;
  return new Date(wallClock - offset).toISOString();
};
const localValue = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
const nextOpen = (date: Date) => {
  while (!PICKUP_HOURS[date.getDay()]) date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return localValue(date);
};
const tomorrow = () => nextOpen(new Date(Date.now() + 86400000));
const printMinimum = () => {
  const threshold = Date.now() + 7 * 86400000,
    d = new Date(threshold);
  d.setHours(9, 0, 0, 0);
  if (d.getTime() < threshold) d.setDate(d.getDate() + 1);
  return nextOpen(d);
};
type WalletState = "blocked" | "loading" | "ready" | "unavailable";
const walletCapabilities = (): { apple: WalletState; google: WalletState } => {
  const appleSession = (
    window as typeof window & {
      ApplePaySession?: { canMakePayments?: () => boolean };
    }
  ).ApplePaySession;
  const apple = Boolean(appleSession?.canMakePayments?.());
  const google =
    typeof window.PaymentRequest === "function" &&
    /(?:Chrome|Chromium|CriOS|Edg)\//.test(navigator.userAgent);
  return {
    apple: apple ? "blocked" : "unavailable",
    google: google ? "blocked" : "unavailable",
  };
};
const slotsFor = (
  dateValue: string,
  type: "pickup" | "delivery",
  schedule = DEFAULT_SCHEDULE,
) => {
  const date = new Date(`${dateValue}T12:00:00`),
    window =
      type === "delivery"
        ? date.getDay() === 6
          ? undefined
          : ([schedule.deliveryStart, schedule.deliveryEnd] as [number, number])
        : PICKUP_HOURS[date.getDay()];
  if (!window) return [];
  return Array.from(
    { length: Math.floor((window[1] - window[0]) / schedule.intervalMinutes) },
    (_, index) => {
      const start = window[0] + index * schedule.intervalMinutes,
        hour = Math.floor(start / 60),
        minute = start % 60,
        value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        label = `${timeLabel(start)} – ${timeLabel(start + schedule.intervalMinutes)}`;
      return { value, label };
    },
  );
};
async function api(path: string, options?: RequestInit) {
  const response = await fetch(`/api/house${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("The checkout service is unavailable. Please try again shortly.");
  }
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Request failed.");
  return body;
}
function Checkout() {
  const { lines, subtotal, customize, clear, products } = useShop();
  const customReady = lines.every((line) =>
    customizationComplete(line.product.id, line.qty, line.customization),
  );
  const blockedCount = lines.filter(
    (line) =>
      !customizationComplete(line.product.id, line.qty, line.customization),
  ).length;
  const requiresPrintLeadTime = lines.some((line) =>
    PRINT_PRODUCTS.has(line.product.id),
  );
  const scheduledMinimum = requiresPrintLeadTime ? printMinimum() : tomorrow();
  const [session, setSession] = useState<Session>();
  const [authOpen, setAuthOpen] = useState(false);
  /* Guest first, and by default.

     Sign-in used to be the only way through here — the page said so, and the
     modal opened by itself on arrival. An account is worth having, but it is
     the bakery's interest, not the customer's, and demanding one before a
     first order asks a stranger to commit to a relationship in order to buy a
     box of donuts. So the two are offered as what they are: a way to order
     now, and a way to order now AND keep the order, the addresses and the
     account credit. Guest leads because it is the shorter road and the one a
     first-time visitor wants; signed-in customers are recognised on arrival
     and never see the choice at all. */
  const [identity, setIdentity] = useState<"guest" | "account">("guest");
  /* One name, not two. The bakery calls it out at a counter and writes it on
     a box; a surname is a field a stranger fills in because a form asked, and
     Square wants `display_name`, which one name satisfies. */
  const [guest, setGuest] = useState({ name: "", email: "" });
  /* Empty until one is picked. It defaulted to 'card', which mounted the Square
     card iframe on arrival and made "choose how to pay" a decision nobody was
     asked to make — the intake was simply already there. */
  const [method, setMethod] = useState<"" | "card" | "house_account">("");
  const [authorizationPin, setAuthorizationPin] = useState("");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(() =>
    readFulfillmentPreference(),
  );
  /* Pre-filled from the band when a slot was picked while shopping, so a
     visitor who set one is not asked twice. Nothing sets it by default any
     more, so the ordinary path through here is the fallback: the next open
     day, chosen on this page. */
  const [scheduledAt, setScheduledAt] = useState(() => {
    const chosen = readPickup();
    return chosen ? `${chosen.date}T${chosen.time}` : tomorrow();
  });
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<Address>(blankAddress);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [addressType, setAddressType] = useState<"home" | "work" | "other">(
    "home",
  );
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [noContact, setNoContact] = useState(false);
  const [config, setConfig] = useState<any>();
  const [quote, setQuote] = useState<any>();
  const [quoteError, setQuoteError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [success, setSuccess] = useState<any>();
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [saveCardForAccount, setSaveCardForAccount] = useState(false);
  const card = useRef<SquareCard | undefined>(undefined);
  const applePay = useRef<SquareWallet | undefined>(undefined);
  const googlePay = useRef<SquareWallet | undefined>(undefined);
  const [wallets, setWallets] = useState(walletCapabilities);
  /* One answer to "who is this order for", whichever lane produced it, so
     nothing downstream has to ask which lane that was. */
  const asGuest = !session?.user && identity === "guest";
  const contact =
    session?.user ??
    (asGuest
      ? {
          firstName: guest.name.trim(),
          lastName: "",
          email: guest.email.trim(),
        }
      : null);
  /* Enough to place an order with. A guest needs a name to call out at the
     counter and an address to send the confirmation to; everything past that
     is what an account is FOR, and asking for it here would rebuild the wall
     this replaces. */
  const validPhone = isValidNorthAmericanPhone(phone);
  const identified =
    Boolean(session?.user) ||
    Boolean(
      asGuest &&
      contact?.firstName &&
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email) &&
      validPhone,
    );
  /* Artwork is uploaded against a user before the order exists — see
     `/storefront/custom-assets`, which is behind `requireUser`. A guest cannot
     hold an upload, so a printed item in the bag is the one thing that still
     requires an account. */
  const guestBlockedByPrint = asGuest && requiresPrintLeadTime;
  const ready = identified && !guestBlockedByPrint;
  const schedule = config?.delivery?.schedule || DEFAULT_SCHEDULE;
  const fulfillmentTimes = slotsFor(
    scheduledAt.slice(0, 10),
    fulfillment,
    schedule,
  );
  const loadSession = () =>
    api("/storefront/session")
      .then(async (body) => {
        setSession(body);
        // A delayed session response must not erase contact details already typed.
        setPhone((current) => current || formatNorthAmericanPhone(body.profile?.default_phone || ""));
        if (body.user) {
          const saved = await api("/storefront/addresses");
          setSavedAddresses(saved.addresses || []);
          setAddress({
            ...blankAddress,
            ...(saved.addresses?.find((item: SavedAddress) => item.isDefault) ||
              body.profile?.default_address ||
              {}),
          });
        }
      })
      .catch((cause) => setError(cause.message));
  useEffect(() => {
    void loadSession();
    void api("/storefront/config")
      .then(setConfig)
      .catch((cause) => setError(cause.message));
  }, []);
  useEffect(() => {
    if (config?.delivery?.enabled === false && fulfillment === "delivery") {
      setFulfillment("pickup");
      writeFulfillmentPreference("pickup");
    }
  }, [config, fulfillment]);
  /* Dates, not datetimes. The rule being enforced is "not before the earliest
     open day"; the 09:00 in `scheduledMinimum` is an artifact of `nextOpen`
     picking an arbitrary hour, not an opening time — Sunday opens at 8. A full
     string compare made every window before 9am on the earliest day fail this
     test and snap forward, so a visitor who chose 8:00–8:30 at the pickup gate
     silently arrived here booked for 9:00. The slot effect below still
     guarantees the time is one the counter actually offers that day. */
  useEffect(() => {
    if (scheduledAt.slice(0, 10) < scheduledMinimum.slice(0, 10))
      setScheduledAt(scheduledMinimum);
  }, [scheduledAt, scheduledMinimum]);
  useEffect(() => {
    if (
      fulfillmentTimes.length &&
      !fulfillmentTimes.some((slot) => slot.value === scheduledAt.slice(11, 16))
    )
      setScheduledAt(
        `${scheduledAt.slice(0, 10)}T${fulfillmentTimes[0].value}`,
      );
  }, [scheduledAt, fulfillmentTimes]);
  useEffect(() => {
    if (!config?.applicationId || method !== "card" || !ready) return;
    let cancelled = false;
    const mount = async () => {
      await ensureSquare(config.environment);
      if (cancelled || !window.Square) return;
      card.current = await window.Square.payments(
        config.applicationId,
        config.locationId,
      ).card();
      await card.current.attach("#square-card");
    };
    void mount().catch((cause) => setError(cause.message));
    return () => {
      cancelled = true;
      void card.current?.destroy().catch(() => {});
      card.current = undefined;
    };
  }, [config, method, ready]);
  useEffect(() => {
    const capability = walletCapabilities();
    if (!config?.applicationId || !ready || !validPhone || quoteError || !quote?.order?.total) {
      setWallets(capability);
      return;
    }
    let cancelled = false;
    setWallets({
      apple: capability.apple === "unavailable" ? "unavailable" : "loading",
      google: capability.google === "unavailable" ? "unavailable" : "loading",
    });
    const mount = async () => {
      await ensureSquare(config.environment);
      if (cancelled || !window.Square) return;
      const payments = window.Square.payments(
          config.applicationId,
          config.locationId,
        ),
        request = payments.paymentRequest({
          countryCode: "CA",
          currencyCode: quote.order.currency,
          total: {
            amount: (quote.order.total / 100).toFixed(2),
            label: "Amazing Donuts",
          },
        });
      if (capability.apple !== "unavailable") {
        try {
          const wallet = await payments.applePay(request);
          if (!cancelled) {
            applePay.current = wallet;
            setWallets((current) => ({ ...current, apple: "ready" }));
          }
        } catch {
          if (!cancelled)
            setWallets((current) => ({ ...current, apple: "unavailable" }));
        }
      }
      if (capability.google !== "unavailable") {
        try {
          const wallet = await payments.googlePay(request);
          if (cancelled) return;
          googlePay.current = wallet;
          await wallet.attach?.("#google-pay-button", {
            buttonColor: "black",
            buttonType: "pay",
          });
          if (!cancelled)
            setWallets((current) => ({ ...current, google: "ready" }));
        } catch {
          if (!cancelled)
            setWallets((current) => ({ ...current, google: "unavailable" }));
        }
      }
    };
    void mount().catch(() => {
      if (!cancelled) setWallets({ apple: "unavailable", google: "unavailable" });
    });
    return () => {
      cancelled = true;
      void applePay.current?.destroy?.().catch(() => {});
      void googlePay.current?.destroy?.().catch(() => {});
      applePay.current = undefined;
      googlePay.current = undefined;
    };
  }, [config, quote?.order?.currency, quote?.order?.total, quoteError, ready, validPhone]);
  const items = () =>
    lines.map((line) => ({ name: line.product.name, quantity: line.qty }));
  const boxCustomizations = () => lines.filter(line => line.customization?.kind === "box").map(line => ({
    productName: line.product.name,
    kind: "box" as const,
    donuts: line.customization?.kind === "box" ? line.customization.donuts.map(id => products.find(product => product.id === id)?.name || id) : [],
  }));
  const labCustomizations = () => lines.flatMap(line => line.customization?.kind === "lab" ? [{
    productName: line.product.name, kind: "lab" as const,
    elements: line.customization.elements.map(({label,value}) => ({label,value}))
  }] : []);
  const fulfillmentBody = () => ({
    type: fulfillment,
    scheduledAt: torontoISOString(scheduledAt),
    recipient: {
      displayName:
        `${contact?.firstName || ""} ${contact?.lastName || ""}`.trim(),
      email: contact?.email || "",
      phone,
    },
    ...(fulfillment === "delivery"
      ? { address, deliveryInstructions, noContact }
      : {}),
  });
  useEffect(() => {
    if (
      !ready ||
      !lines.length ||
      !customReady ||
      !validPhone ||
      !scheduledAt ||
      (fulfillment === "delivery" &&
        (!address.addressLine1 ||
          address.postalCode.replace(/\s/g, "").length < 6))
    ) {
      setQuote(undefined);
      setQuoteError(phone && !validPhone ? "Enter a valid Canadian or US phone number." : "");
      return;
    }
    setQuote(undefined);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api(asGuest ? "/public/storefront/quote" : "/storefront/quote", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          items: items(),
          customizations: [...boxCustomizations(), ...labCustomizations()],
          fulfillment: fulfillmentBody(),
        }),
      })
        .then((body) => {
          setQuote(body);
          setQuoteError("");
        })
        .catch((cause) => {
          if (cause.name !== "AbortError") {
            setQuote(undefined);
            setQuoteError(cause.message);
          }
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    ready,
    session?.user,
    lines,
    customReady,
    phone,
    scheduledAt,
    fulfillment,
    address,
    deliveryInstructions,
    noContact,
  ]);
  /* Guests never reach the upload branch — `guestBlockedByPrint` stops the
     order before this runs — but the guard is here too, because the endpoint
     it posts to is behind `requireUser` and a silent 401 mid-checkout is the
     worst possible place to discover that. */
  const uploadCustomizations = async () => {
    if (asGuest && lines.some((line) => PRINT_PRODUCTS.has(line.product.id)))
      throw new Error(
        "Custom-printed items need an account. Please sign in to order them.",
      );
    const output: {
      productName: string;
      kind: string;
      glyph?: string;
      icingFlavour?: string;
      sprinkleColours?: string;
      artworks?: { assetId: string; count: number }[];
      donuts?: string[];
      elements?: { label: string; value: string }[];
    }[] = [...boxCustomizations(), ...labCustomizations()];
    for (const line of lines) {
      const custom = line.customization;
      if (custom?.kind === "glyph")
        output.push({
          productName: line.product.name,
          kind: "glyph",
          glyph: custom.glyph,
        });
      if (custom?.kind === "print") {
        const artworks: { assetId: string; count: number }[] = [],
          updated = [];
        for (const art of custom.artworks) {
          let assetId = art.assetId;
          if (!assetId) {
            const body = await api("/storefront/custom-assets", {
              method: "POST",
              body: JSON.stringify({
                fileName: art.name,
                dataUrl: art.dataUrl,
              }),
            });
            assetId = body.asset.id as string;
          }
          if (!assetId) throw new Error("Artwork upload failed.");
          artworks.push({ assetId, count: art.count });
          updated.push({ ...art, assetId });
        }
        const next: Customization = { ...custom, artworks: updated };
        customize(lineKeyOf(line), next);
        output.push({
          productName: line.product.name,
          kind: "print",
          icingFlavour: custom.icingFlavour,
          sprinkleColours: custom.sprinkleColours,
          artworks,
        });
      }
    }
    return output;
  };
  const place = async (
    event?: React.FormEvent,
    cardConfirmed = false,
    presetSource?: string,
    alreadyLocked = false,
  ) => {
    event?.preventDefault();
    if (submitting.current && !alreadyLocked) return;
    if (!identified) {
      if (!asGuest) setAuthOpen(true);
      return;
    }
    if (!lines.length || !customReady || !quote) return;
    if (!method && !presetSource) {
      setError("Choose how you would like to pay.");
      return;
    }
    if (
      method === "card" &&
      !presetSource &&
      session?.houseAccount?.status === "active" &&
      !session.houseAccount.card &&
      !saveCardForAccount &&
      !cardConfirmed
    ) {
      setConfirmPayment(true);
      return;
    }
    setConfirmPayment(false);
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      if (
        !asGuest &&
        fulfillment === "delivery" &&
        saveAddress &&
        !savedAddresses.some((item) => sameAddress(item, address))
      ) {
        const saved = await api("/storefront/addresses", {
          method: "POST",
          body: JSON.stringify({
            ...address,
            label: addressLabel,
            addressType,
            isDefault: savedAddresses.length === 0,
          }),
        });
        setSavedAddresses((current) => [...current, saved.address]);
        setSaveAddress(false);
      }
      let sourceId: string | undefined = presetSource;
      if (method === "card" && !sourceId) {
        if (!card.current)
          throw new Error("The secure card form is still loading.");
        const shouldSave = Boolean(
            session?.houseAccount?.status === "active" &&
            !session.houseAccount.card &&
            saveCardForAccount,
          ),
          token = await card.current.tokenize(
            shouldSave
              ? {
                  intent: "STORE",
                  customerInitiated: true,
                  sellerKeyedIn: false,
                  billingContact: {
                    givenName: contact!.firstName,
                    familyName: contact!.lastName,
                    email: contact!.email,
                    phone,
                  },
                }
              : {
                  amount: (quote.order.total / 100).toFixed(2),
                  currencyCode: quote.order.currency,
                  intent: "CHARGE",
                  customerInitiated: true,
                  sellerKeyedIn: false,
                  billingContact: {
                    givenName: contact!.firstName,
                    familyName: contact!.lastName,
                    email: contact!.email,
                    phone,
                    addressLines: [
                      address.addressLine1,
                      address.addressLine2,
                    ].filter(Boolean),
                    city: address.locality,
                    state: address.administrativeDistrictLevel1,
                    postalCode: address.postalCode,
                    countryCode: address.country,
                  },
                },
          );
        if (token.status !== "OK" || !token.token)
          throw new Error(
            token.errors?.[0]?.message || "Card authorization failed.",
          );
        if (shouldSave) {
          await api("/storefront/house-card", {
            method: "POST",
            body: JSON.stringify({
              sourceId: token.token,
              consent: true,
              cardholderName: `${contact!.firstName} ${contact!.lastName}`,
            }),
          });
          sourceId = "SAVED_CARD";
        } else sourceId = token.token;
      }
      const customizations = await uploadCustomizations();
      const result = await api(
        asGuest ? "/public/storefront/checkout" : "/storefront/checkout",
        {
          method: "POST",
          body: JSON.stringify(
            asGuest
              ? {
                  idempotencyKey: crypto.randomUUID(),
                  items: items(),
                  customizations,
                  fulfillment: fulfillmentBody(),
                  paymentMethod: "card",
                  sourceId,
                  guest: {
                    firstName: contact!.firstName,
                    lastName: contact!.lastName,
                    email: contact!.email,
                    phone,
                  },
                }
              : {
                  idempotencyKey: crypto.randomUUID(),
                  items: items(),
                  customizations,
                  fulfillment: fulfillmentBody(),
                  paymentMethod: presetSource ? "card" : method,
                  sourceId,
                  authorizationPin:
                    !presetSource && method === "house_account" ? authorizationPin : undefined,
                },
          ),
        },
      );
      clear();
      setSuccess({ ...result.order, delivery: result.delivery });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout failed.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const payWithWallet = (wallet: SquareWallet | undefined) => {
    if (!wallet || submitting.current || busy || !ready || !validPhone || !quote || quoteError) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    const tokenization = wallet.tokenize();
    void tokenization
      .then((token) => {
        if (token.status !== "OK" || !token.token)
          throw new Error(
            token.errors?.[0]?.message || "Wallet authorization failed.",
          );
        return place(undefined, true, token.token, true);
      })
      .catch((cause) => {
        submitting.current = false;
        setBusy(false);
        setError(
          cause instanceof Error ? cause.message : "Wallet payment failed.",
        );
      });
  };
  const saveAndUseCredit = async () => {
    if (!session?.user || !card.current || !quote || submitting.current) return;
    submitting.current = true;
    setConfirmPayment(false);
    setBusy(true);
    setError("");
    try {
      const token = await card.current.tokenize({
        intent: "STORE",
        customerInitiated: true,
        sellerKeyedIn: false,
        billingContact: {
          givenName: session.user.firstName,
          familyName: session.user.lastName,
          email: session.user.email,
          phone,
        },
      });
      if (token.status !== "OK" || !token.token)
        throw new Error(
          token.errors?.[0]?.message || "Card authorization failed.",
        );
      await api("/storefront/house-card", {
        method: "POST",
        body: JSON.stringify({
          sourceId: token.token,
          consent: true,
          cardholderName: `${session.user.firstName} ${session.user.lastName}`,
        }),
      });
      const customizations = await uploadCustomizations();
      const result = await api("/storefront/checkout", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          items: items(),
          customizations,
          fulfillment: fulfillmentBody(),
          paymentMethod: "house_account",
          authorizationPin,
        }),
      });
      clear();
      setSuccess({ ...result.order, delivery: result.delivery });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Card could not be saved.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  if (success)
    return (
      <main className="commerce-shell">
        <section className="commerce-success">
          <ShoppingBag />
          <p>Order confirmed</p>
          <h1>Your bag is on the bakery's list.</h1>
          <strong>Order #{success.id.slice(-8)}</strong>
          <span>
            {money(success.total / 100)} · {fulfillment}
          </span>
          {success.delivery && (
            <small>Delivery is awaiting assignment by the bakery.</small>
          )}
          <a href={asGuest ? "/shop/" : "/account/"}>
            {asGuest ? "Continue shopping" : "View my orders"}
          </a>
        </section>
      </main>
    );
  const payable = quote?.order?.total / 100;
  return (
    <main className="commerce-shell">
      <header className="commerce-top">
        <a href="/shop/">
          <ArrowLeft /> <span>Back to the shop</span>
        </a>
        <CommerceLogo />
        {session?.user ? (
          <a href="/account/">My account</a>
        ) : (
          <button
            type="button"
            className="commerce-top__signin"
            onClick={() => setAuthOpen(true)}
          >
            Sign in
          </button>
        )}
      </header>
      <div className={`checkout-grid${busy ? " is-processing-payment" : ""}`} aria-busy={busy}>
        {busy && (
          <div className="payment-progress" role="status" aria-live="polite">
            <span aria-hidden="true" />
            <strong>Confirming your payment</strong>
            <small>Please keep this page open.</small>
          </div>
        )}
        <form id="checkout" className="checkout-form" onSubmit={place}>
          <div className="commerce-heading">
            <p>Secure checkout</p>
            <h1>Finish your order</h1>
            <span>
              <LockKeyhole />{" "}
              <span>
                Card details are encrypted and handled by Square. We never see
                them.
              </span>
            </span>
          </div>
          {/* Three panels, in the order they are answered: who you are, how you
          want it, how you are paying. Each is numbered, and each is disabled
          until the one above it is answered — which is what makes it a
          sequence rather than three sections that happen to be stacked.

          Payment used to sit in the right-hand column beside the bag. That put
          the last step of the form outside the form, in the summary, where it
          read as part of the receipt; it also meant the eye had to cross the
          page and come back. The bag stays on the right because it is not a
          step — it is what all three steps are about. */}
          <div className="checkout-step" data-step="1">
            {session?.user ? (
              <section className="signed-row">
                <div>
                  <strong>
                    {session.user.firstName} {session.user.lastName}
                  </strong>
                  <span>{session.user.email}</span>
                </div>
                <a href="/account/">Manage account</a>
              </section>
            ) : (
              <fieldset className="identity-choice" disabled={busy}>
                <legend>Your details</legend>
                {/* Two lanes, guest open by default. Not a segmented control: these are
            not two settings of one thing, they are two different amounts of
            work, and the one that costs nothing should already be underway
            when the page arrives rather than waiting behind a tab. */}
                <div
                  className={`identity-lane${identity === "guest" ? " is-open" : ""}`}
                >
                  <button
                    type="button"
                    className="identity-lane__head"
                    aria-expanded={identity === "guest"}
                    onClick={() => setIdentity("guest")}
                  >
                    <UserRound />
                    <span>
                      <strong>Continue as a guest</strong>
                      <small>
                        No account, no password. We email the receipt.
                      </small>
                    </span>
                  </button>
                  {identity === "guest" && (
                    <div className="identity-lane__body">
                      <label>
                        <span>Name</span>
                        <input
                          value={guest.name}
                          onChange={(event) =>
                            setGuest({ ...guest, name: event.target.value })
                          }
                          autoComplete="name"
                          required
                        />
                      </label>
                      <label>
                        <span>Email</span>
                        <input
                          type="email"
                          value={guest.email}
                          onChange={(event) =>
                            setGuest({ ...guest, email: event.target.value })
                          }
                          autoComplete="email"
                          required
                        />
                      </label>
                      {/* The three Square actually needs from a guest, together.
                `OrderFulfillmentRecipient` takes `display_name` and
                `phone_number` directly when there is no customer_id, and
                CreatePayment takes `buyer_email_address` — so this block is
                exactly the API's own minimum, and the phone is not an extra
                question, it is one of the three. It used to sit under
                Fulfillment, which asked a stranger for their name and email,
                then for a collection time, and only then for the number the
                counter would ring. It still lives there for a signed-in
                customer, pre-filled from their profile — one field, one piece
                of state, rendered wherever the answer is being gathered. */}
                      <label>
                        <span>Phone</span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(event) =>
                            setPhone(
                              formatNorthAmericanPhone(event.target.value),
                            )
                          }
                          autoComplete="tel"
                          required
                        />
                      </label>
                      {/* The one thing a guest cannot do, said where the choice is made
                rather than at the button after everything else is filled in. */}
                      {guestBlockedByPrint && (
                        <p className="identity-note">
                          Custom-printed items need an account, because the
                          artwork is stored against it. Sign in below to keep
                          them.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="identity-or" aria-hidden="true">
                  or
                </div>

                <div
                  className={`identity-lane${identity === "account" ? " is-open" : ""}`}
                >
                  <button
                    type="button"
                    className="identity-lane__head"
                    aria-expanded={identity === "account"}
                    onClick={() => setIdentity("account")}
                  >
                    <LockKeyhole />
                    <span>
                      <strong>Sign in or create an account</strong>
                      <small>
                        Order history, saved addresses and account credit.
                      </small>
                    </span>
                  </button>
                  {identity === "account" && (
                    <div className="identity-lane__body">
                      <p>Your bag is saved while you sign in.</p>
                      <button
                        type="button"
                        className="identity-signin"
                        onClick={() => setAuthOpen(true)}
                      >
                        Sign In/Create Account
                      </button>
                    </div>
                  )}
                </div>
              </fieldset>
            )}
          </div>

          <div className="checkout-step" data-step="2">
            <fieldset disabled={!identified || busy}>
              <legend>Fulfillment</legend>
              <div className="segment">
                <button
                  type="button"
                  className={fulfillment === "pickup" ? "active" : ""}
                  onClick={() => {
                    setFulfillment("pickup");
                    writeFulfillmentPreference("pickup");
                  }}
                >
                  <Store /> Pickup
                </button>
                <button
                  type="button"
                  className={fulfillment === "delivery" ? "active" : ""}
                  disabled={config?.delivery?.enabled === false}
                  onClick={() => {
                    setFulfillment("delivery");
                    writeFulfillmentPreference("delivery");
                    clearPickup();
                  }}
                >
                  <Truck /> Delivery
                </button>
              </div>
              {fulfillment === "delivery" && config?.delivery && (
                <p className="delivery-policy">
                  Local delivery is {money(config.delivery.feeAmount / 100)} and
                  free on merchandise orders of{" "}
                  {money(config.delivery.freeThreshold / 100)} or more.{" "}
                  {money(config.delivery.minimumAmount / 100)} minimum.
                </p>
              )}
              <h2 className="schedule-legend">
                {fulfillment === "pickup"
                  ? "When are you collecting?"
                  : "When should we deliver?"}
              </h2>
              <div className="fulfillment-schedule">
                {fulfillment === "pickup" && (
                  <p className="pickup-where">
                    <Store />{" "}
                    <span>
                      Collecting from <strong>{SHOP_ADDRESS.street}</strong>,{" "}
                      {SHOP_ADDRESS.city}. We will have your bag boxed and
                      waiting.
                    </span>
                  </p>
                )}
                <div className="checkout-date-field">
                  <span>Date</span>
                  <BrandDatePicker
                    value={scheduledAt.slice(0, 10)}
                    min={scheduledMinimum.slice(0, 10)}
                    onChange={(value) => setScheduledAt(`${value}T09:00`)}
                    ariaLabel="Choose a pickup or delivery date"
                    disabledDay={(day) => day.getDay() === 6}
                  />
                </div>
                <div className="checkout-time-field">
                  <span>Time window</span>
                  <BrandTimePicker
                    value={
                      fulfillmentTimes.length ? scheduledAt.slice(11, 16) : ""
                    }
                    disabled={!fulfillmentTimes.length}
                    options={fulfillmentTimes}
                    onChange={(value) =>
                      setScheduledAt(
                        `${scheduledAt.slice(0, 10)}T${value}`,
                      )
                    }
                  />
                </div>
                {requiresPrintLeadTime && (
                  <small>
                    Custom-printed items require at least one week's notice.
                  </small>
                )}
                <small className="schedule-hours">
                  {fulfillment === "pickup"
                    ? `${HOURS_SUMMARY} Windows are ${SLOT_MINUTES} minutes long.`
                    : `Delivery windows run ${timeLabel(schedule.deliveryStart)}–${timeLabel(schedule.deliveryEnd)} Sunday through Friday. Saturday closed. Times are in ${schedule.intervalMinutes}-minute windows.`}
                </small>
              </div>
              {/* Guests answered this with their name and email — see the identity
            block above. A signed-in customer has no such block, so it is asked
            here, where it always was. */}
              {!asGuest && (
                <label>
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(formatNorthAmericanPhone(event.target.value))
                    }
                    autoComplete="tel"
                    required
                  />
                </label>
              )}
              {fulfillment === "delivery" && (
                <div className="address-fields">
                  {savedAddresses.length > 0 && (
                    <label className="saved-address-select">
                      <span>Saved address</span>
                      <select
                        value={
                          savedAddresses.find((item) =>
                            sameAddress(item, address),
                          )?.id || ""
                        }
                        onChange={(event) => {
                          const selected = savedAddresses.find(
                            (item) => item.id === event.target.value,
                          );
                          if (selected) setAddress(addressValue(selected));
                        }}
                      >
                        <option value="">Use another address</option>
                        {savedAddresses.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                            {item.isDefault ? " · Default" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    <span>Street address</span>
                    <AddressAutocomplete
                      address={address}
                      onChange={setAddress}
                      enabled={Boolean(config?.placesEnabled)}
                      required
                    />
                  </label>
                  <label>
                    <span>Unit</span>
                    <input
                      value={address.addressLine2}
                      onChange={(event) =>
                        setAddress({
                          ...address,
                          addressLine2: event.target.value,
                        })
                      }
                      autoComplete="address-line2"
                    />
                  </label>
                  <label>
                    <span>City</span>
                    <input
                      value={address.locality}
                      onChange={(event) =>
                        setAddress({ ...address, locality: event.target.value })
                      }
                      autoComplete="address-level2"
                      required
                    />
                  </label>
                  <label>
                    <span>Postal code</span>
                    <input
                      value={address.postalCode}
                      onChange={(event) =>
                        setAddress({
                          ...address,
                          postalCode: event.target.value.toUpperCase(),
                        })
                      }
                      autoComplete="postal-code"
                      required
                    />
                  </label>
                  {!asGuest &&
                    !savedAddresses.some((item) =>
                      sameAddress(item, address),
                    ) && (
                    <div className="save-address-row">
                      <label className="no-contact">
                        <input
                          type="checkbox"
                          checked={saveAddress}
                          onChange={(event) =>
                            setSaveAddress(event.target.checked)
                          }
                        />
                        <span>Save this address</span>
                      </label>
                      {saveAddress && (
                        <>
                          <label>
                            <span>Label</span>
                            <input
                              value={addressLabel}
                              onChange={(event) =>
                                setAddressLabel(event.target.value)
                              }
                              placeholder="Home, Work..."
                              required
                            />
                          </label>
                          <label>
                            <span>Type</span>
                            <select
                              value={addressType}
                              onChange={(event) =>
                                setAddressType(
                                  event.target.value as typeof addressType,
                                )
                              }
                            >
                              <option value="home">Home</option>
                              <option value="work">Work</option>
                              <option value="other">Other</option>
                            </select>
                          </label>
                        </>
                      )}
                    </div>
                  )}
                  <label className="delivery-instructions">
                    <span>Drop-off instructions</span>
                    <textarea
                      value={deliveryInstructions}
                      onChange={(event) =>
                        setDeliveryInstructions(event.target.value)
                      }
                      maxLength={500}
                      rows={3}
                    />
                  </label>
                  <label className="no-contact">
                    <input
                      type="checkbox"
                      checked={noContact}
                      onChange={(event) => setNoContact(event.target.checked)}
                    />
                    <span>No-contact delivery</span>
                  </label>
                </div>
              )}
            </fieldset>
          </div>

          <div className="checkout-step" data-step="3">
            <fieldset className="payment-panel" disabled={!ready || busy}>
              <legend>Payment</legend>
              {/* Apple Pay and Google Pay are choices in the list, not a strip above
            it labelled "express checkout". They are ways to pay, exactly as a
            card is, and pressing one is the whole transaction — so a visitor
            scanning the options should see all of them at once rather than a
            shortcut bar and then, separately, "the real options". */}
              <div className="payment-options">
                {/* Both wallets are listed from the moment Square is configured,
              not from the moment it returns a total. They used to be gated on
              the quote, so the list opened as a single row — "Credit or debit
              card" — and the two one-press options arrived under it a second
              later, after the eye had already settled. A named placeholder
              holds each slot until its own button can be mounted; a wallet the
              device does not have drops out and leaves nothing behind. */}
                {config?.applicationId && wallets.apple !== "unavailable" && (
                  <div
                    className={`apple-pay-slot wallet-slot${wallets.apple === "ready" ? "" : " is-disabled"}`}
                  >
                    {wallets.apple === "ready" ? (
                      <button
                        type="button"
                        className="apple-pay-button"
                        aria-label="Pay with Apple Pay"
                        onClick={() => payWithWallet(applePay.current)}
                      />
                    ) : (
                      <button
                        type="button"
                        className="apple-pay-button"
                        aria-label="Apple Pay will be available after contact details are entered"
                        disabled
                      />
                    )}
                  </div>
                )}
                {config?.applicationId && wallets.google !== "unavailable" && (
                  <div
                    className={`google-pay-slot wallet-slot${wallets.google === "ready" ? "" : " is-disabled"}`}
                  >
                    <div
                      id="google-pay-button"
                      className={wallets.google === "ready" ? "is-ready" : ""}
                      onClick={() => payWithWallet(googlePay.current)}
                    />
                    {wallets.google !== "ready" && (
                      <div className="wallet-slot__label">Google&nbsp;Pay</div>
                    )}
                  </div>
                )}

                <div className="payment-choice">
                  <button
                    type="button"
                    className={method === "card" ? "active" : ""}
                    onClick={() => setMethod("card")}
                    aria-expanded={method === "card"}
                    aria-controls="card-payment-fields"
                  >
                    <CreditCard />
                    <span>
                      <strong>Credit or debit card</strong>
                      <small>Securely processed by Square</small>
                    </span>
                  </button>
                  {method === "card" && (
                    <div id="card-payment-fields" className="payment-choice__fields">
                      <div id="square-card" className="square-card" />
                      {!asGuest && session?.houseAccount?.status === "active" && !session.houseAccount.card && (
                        <label className="save-card-choice">
                          <input
                            type="checkbox"
                            checked={saveCardForAccount}
                            onChange={(event) => setSaveCardForAccount(event.target.checked)}
                          />
                          <span>
                            <strong>Save this card for {session.houseAccount.organizationName}</strong>
                            <small>
                              The current order will be charged now. The card will also enable institutional credit and authorized statement collection.
                            </small>
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
                {!asGuest &&
                  session?.houseAccount?.status === "active" &&
                  session.houseAccount.creditEnabled && (
                    <button
                      type="button"
                      className={method === "house_account" ? "active" : ""}
                      onClick={() => setMethod("house_account")}
                    >
                      <Building2 />
                      <span>
                        <strong>Pay on account</strong>
                        <small>
                          {session.houseAccount.organizationName} ·{" "}
                          {money(session.houseAccount.credit.available / 100)}{" "}
                          credit available
                        </small>
                      </span>
                    </button>
                  )}
              </div>

              {method === "house_account" && (
                <>
                  <p className="house-note">
                    This order will be added to your account balance and
                    included on your next statement.
                  </p>
                  <label>
                    <span>Authorization PIN</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]{4,8}"
                      minLength={4}
                      maxLength={8}
                      value={authorizationPin}
                      onChange={(event) =>
                        setAuthorizationPin(event.target.value)
                      }
                      autoComplete="off"
                      required
                    />
                  </label>
                </>
              )}
              {!method && (
                <p className="payment-hint">
                  Wallet payments are one press. Choose a card to enter its
                  details.
                </p>
              )}
            </fieldset>
          </div>
        </form>
        <div className="checkout-side">
          {/* What all three steps are about, and the button that commits them. */}
          <aside className="order-summary">
            <p>Your bag</p>
            <h2>{lines.reduce((total, line) => total + line.qty, 0)} items</h2>
            {lines.map((line) => {
              /* The line that is holding the order up, marked on the line itself.
     The place-order button knew one of these existed and said so, but it
     could not say WHICH — and the bag it sent people back to could not
     answer the question either, because a bag row reads a spec back rather
     than asking for it. The ring is Signal, the same colour every other
     "this needs you" on the site uses, and the question follows underneath
     it in place. */
              const blocked = !customizationComplete(
                line.product.id,
                line.qty,
                line.customization,
              );
              return (
                <div
                  className={`summary-item${blocked ? " summary-item--attention" : ""}`}
                  key={lineKeyOf(line)}
                >
                  <div className="summary-line">
                    <img src={line.product.img} alt="" />
                    <span>
                      <strong>{line.product.name}</strong>
                      <small>Qty {line.qty}</small>
                    </span>
                    <b>
                      {money(
                        Number(line.product.price.replace(/[^0-9.]/g, "")) *
                          line.qty,
                      )}
                    </b>
                  </div>
                  {blocked && (
                    <CheckoutFix
                      productId={line.product.id}
                      qty={line.qty}
                      value={line.customization}
                      onChange={(next) => customize(lineKeyOf(line), next)}
                    />
                  )}
                </div>
              );
            })}
            <div className="summary-breakdown">
              <span>Merchandise</span>
              <b>
                {quote
                  ? money(
                      (quote.order.subtotal - (quote.delivery?.fee || 0)) / 100,
                    )
                  : money(subtotal)}
              </b>
              {quote?.delivery && (
                <>
                  <span>Delivery</span>
                  <b>
                    {quote.delivery.free
                      ? "Free"
                      : money(quote.delivery.fee / 100)}
                  </b>
                </>
              )}
              {quote && (
                <>
                  <span>HST</span>
                  <b>{money(quote.order.tax / 100)}</b>
                </>
              )}
            </div>
            <div className="summary-total">
              <span>{quote ? "Total" : "Estimated subtotal"}</span>
              <strong>{money(quote ? payable : subtotal)}</strong>
            </div>
            <small>
              {quote?.delivery
                ? "The bakery assigns the driver after payment. Square does not dispatch the courier."
                : "Square confirms catalog pricing, HST, discounts, and the final total before payment."}
            </small>
          </aside>
          {(quoteError || error) && (
            <p className="checkout-error" role="alert">
              {quoteError || error}
            </p>
          )}
          {/* Outside the form element, attached to it by `form`: the button belongs
          under the total it quotes, and the total lives in this column. */}
          <button
            className="place-order"
            form="checkout"
            disabled={
              !ready ||
              !validPhone ||
              !lines.length ||
              !customReady ||
              !quote ||
              !method ||
              busy
            }
          >
            {busy
              ? "Confirming payment..."
              : guestBlockedByPrint
                ? "Sign in to order printed items"
                : phone && !validPhone
                  ? "Enter a valid phone number"
                : !identified
                  ? "Add your name, email and number"
                  : !customReady
                    ? `Finish the highlighted item${blockedCount === 1 ? "" : "s"}`
                    : !method
                      ? "Choose how to pay"
                      : quote
                        ? `Place order · ${money(payable)}`
                        : quoteError
                          ? "Check your order details"
                          : "Calculating Square total..."}
          </button>
        </div>
      </div>
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={loadSession}
      />
      {confirmPayment && (
        <div
          className="payment-confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmPayment(false);
          }}
        >
          <section
            className="payment-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-confirm-title"
          >
            <CreditCard />
            <p>Confirm payment</p>
            <h2 id="payment-confirm-title">How would you like to pay?</h2>
            <span>
              {session?.houseAccount?.creditEnabled
                ? "Your card can be charged now, or this order can use your approved account credit."
                : "Pay this order now without saving it, or save the card and use account credit."}
            </span>
            {!session?.houseAccount?.creditEnabled ? (
              <label>
                <span>Institutional account PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4,8}"
                  minLength={4}
                  maxLength={8}
                  value={authorizationPin}
                  onChange={(event) => setAuthorizationPin(event.target.value)}
                />
              </label>
            ) : null}
            <div>
              <button type="button" onClick={() => void place(undefined, true)}>
                Pay this order now · {money(payable)}
              </button>
              {session?.houseAccount?.creditEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    setMethod("house_account");
                    setConfirmPayment(false);
                  }}
                >
                  Use account credit
                </button>
              ) : (
                <button
                  type="button"
                  disabled={authorizationPin.length < 4}
                  onClick={() => void saveAndUseCredit()}
                >
                  Save card and use account credit
                </button>
              )}
            </div>
            <button
              className="payment-confirm-cancel"
              type="button"
              onClick={() => setConfirmPayment(false)}
            >
              Return to checkout
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
export default function CheckoutPage() {
  return (
    <ShopProvider>
      <Checkout />
    </ShopProvider>
  );
}
const addressValue = (address: Address): Address => ({
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2 || "",
  locality: address.locality,
  administrativeDistrictLevel1: address.administrativeDistrictLevel1 || "ON",
  postalCode: address.postalCode,
  country: address.country || "CA",
});
const sameAddress = (left: Address, right: Address) =>
  left.addressLine1 === right.addressLine1 &&
  left.addressLine2 === right.addressLine2 &&
  left.postalCode === right.postalCode;

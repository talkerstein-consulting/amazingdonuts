import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import Masthead from "./components/Masthead.jsx";
import { Hero24 } from "./components/hero-24.tsx";
import Ticker from "./components/Ticker.jsx";
import BuildABox from "./components/BuildABox.jsx";
import DonutBuilder from "./components/DonutBuilder.jsx";
import JackpotSlot from "./components/JackpotSlot.jsx";
import { Features12 } from "./components/features-12.tsx";
import Contact9 from "./components/contact-9.tsx";
import { Footer5 } from "./components/footer-5.tsx";
import CheckoutDrawer from "./components/CheckoutDrawer.jsx";
import CatalogMenu from "./components/CatalogMenu.jsx";
import AccountDrawer from "./components/AccountDrawer.jsx";
import { catalogFlavours, customBuilderAvailability, customDonutCartItem, dozenCartItem, indexCatalog } from "./lib/squareCart.js";
import { FLAVOURS } from "./data/flavours.js";
import { BASES, FILLINGS, ICINGS, SPRINKLES } from "./data/builder.js";
import {
  Categories,
  Certifications,
  CustomPrint,
  InkPanel
} from "./components/Sections.jsx";

const BOX_LIMIT = 12;

const TICKER_TOP = [
  "Nut free since 1997",
  "Kosher pareve · COR 483",
  "Fried this morning",
  "Dairy free",
  "Sixty things in the case",
  "3499 Bathurst Street"
];
const emptyBox = () => ({
  slots: Array(BOX_LIMIT).fill(null),
  landed: { at: null, seq: 0 },   /* seq replays the drop animation on a repeat slot */
  refused: 0                       /* bumped when someone tries a thirteenth */
});

/* A reducer, not useState: adds must see fresh slots even when two clicks land
   in the same tick, or the second donut overwrites the first. */
function boxReducer(state, action) {
  switch (action.type) {
    case "add": {
      const at = state.slots.indexOf(null);
      if (at < 0) return { ...state, refused: state.refused + 1 };
      return {
        slots: state.slots.map((p, i) => (i === at ? action.product : p)),
        landed: { at, seq: state.landed.seq + 1 },
        refused: 0
      };
    }
    case "remove":
      return {
        ...state,
        slots: state.slots.map((p, i) => (i === action.index ? null : p)),
        landed: { at: null, seq: state.landed.seq },
        refused: 0
      };
    case "reset":
      return emptyBox();
    default:
      return state;
  }
}

export default function App() {
  /* The box lives here so the Indecision Machine can drop a donut straight in. */
  const [box, dispatch] = useReducer(boxReducer, null, emptyBox);
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [houseAccount, setHouseAccount] = useState(null);
  const full = box.slots.every(Boolean);
  const squareIndex = useMemo(() => indexCatalog(catalog), [catalog]);
  const pricedFlavours = useMemo(() => catalogFlavours(FLAVOURS, squareIndex), [squareIndex]);
  const builderAvailability = useMemo(() => customBuilderAvailability(squareIndex, {
    bases: BASES, fillings: FILLINGS, icings: ICINGS, sprinkles: SPRINKLES
  }), [squareIndex]);

  useEffect(() => {
    fetch("/api/catalog")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Square catalog unavailable.");
        setCatalog(body);
      })
      .catch((error) => setCatalogError(error.message));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((response) => response.json()).then((body) => setUser(body.user || null)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!user) { setHouseAccount(null); return; }
    fetch("/api/house/account").then((response) => response.json()).then((body) => setHouseAccount(body.account || null)).catch(() => setHouseAccount(null));
  }, [user]);

  const add = useCallback((product) => dispatch({ type: "add", product }), []);
  const removeAt = useCallback((index) => dispatch({ type: "remove", index }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  const addFromMachine = useCallback(
    (product) => {
      if (full) return false;
      add(pricedFlavours.find((flavour) => flavour.id === product.id) || product);
      document.querySelector(".dbox__base")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return true;
    },
    [add, full, pricedFlavours]
  );

  const addDozenToCart = useCallback(() => {
    try {
      const item = dozenCartItem(box.slots.filter(Boolean), squareIndex);
      setCart((current) => [...current, item]);
      setCartOpen(true);
    } catch (error) {
      setCatalogError(error.message);
    }
  }, [box.slots, squareIndex]);

  const addCustomToCart = useCallback((build) => {
    try {
      const item = customDonutCartItem(build, squareIndex);
      setCart((current) => [...current, item]);
      setCartOpen(true);
    } catch (error) {
      setCatalogError(error.message);
    }
  }, [squareIndex]);

  const changeQuantity = useCallback((id, delta) => {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
      .filter((item) => item.quantity > 0));
  }, []);

  const addCatalogToCart = useCallback((item) => {
    setCart((current) => [...current, item]);
    setCartOpen(true);
  }, []);

  const reorder = useCallback((order) => {
    const variationMap = new Map(catalog?.products.flatMap((product) => product.variations.map((variation) => [variation.id, { product, variation }])) || []);
    const modifierMap = new Map(catalog?.modifierLists.flatMap((list) => list.modifiers.map((modifier) => [modifier.id, modifier])) || []);
    const restored = order.lineItems.map((line) => {
      const record = variationMap.get(line.catalogObjectId);
      if (!record) return null;
      const modifiers = line.modifiers.map((item) => modifierMap.get(item.catalog_object_id)).filter(Boolean);
      return {
        id: crypto.randomUUID(), kind: "reorder", name: record.product.name,
        description: [record.variation.name, ...modifiers.map((item) => item.name)].filter(Boolean).join(" / "),
        quantity: line.quantity,
        priceMoney: { amount: Number(record.variation.priceMoney?.amount || 0) + modifiers.reduce((sum, item) => sum + Number(item.priceMoney?.amount || 0), 0), currency: record.variation.priceMoney?.currency || "CAD" },
        imageUrl: record.product.imageUrl || "/assets/logo-amazing-donuts.webp",
        lineItems: [{ catalogObjectId: record.variation.id, quantity: 1, modifiers: modifiers.map((item) => ({ catalogObjectId: item.id, quantity: 1 })), ...(line.note ? { note: line.note } : {}) }]
      };
    }).filter(Boolean);
    if (!restored.length) { setCatalogError("Those products are no longer available in today’s Square menu."); return; }
    setCart((current) => [...current, ...restored]); setAccountOpen(false); setCartOpen(true);
  }, [catalog]);

  return (
    <>
      <Masthead onAccount={() => setAccountOpen(true)} user={user} />
      <main>
        <Hero24 />
        <Ticker lines={TICKER_TOP} />
        <Certifications />
        <CatalogMenu catalog={catalog} error={catalogError} onAdd={addCatalogToCart} />
        <BuildABox
          box={box}
          limit={BOX_LIMIT}
          add={add}
          removeAt={removeAt}
          reset={reset}
          onAddToCart={addDozenToCart}
          orderingReady={Boolean(catalog) && !catalogError}
          flavours={pricedFlavours}
        />
        <DonutBuilder availability={builderAvailability} onAddToCart={addCustomToCart} orderingReady={Boolean(catalog) && !catalogError} />
        <JackpotSlot onTake={addFromMachine} boxFull={full} />
        <Categories />
        <CustomPrint />
        <Features12 />
        <InkPanel />
        <Contact9 />
      </main>
      <Footer5 />
      <CheckoutDrawer
        cart={cart}
        open={cartOpen}
        onOpen={setCartOpen}
        onRemove={(id) => setCart((current) => current.filter((item) => item.id !== id))}
        onQuantity={changeQuantity}
        onComplete={() => setCart([])}
        user={user}
        houseAccount={houseAccount}
      />
      <AccountDrawer open={accountOpen} onOpen={setAccountOpen} user={user} onUser={setUser} onReorder={reorder} />
      {catalogError ? <p className="order-toast" role="alert">{catalogError}</p> : null}
    </>
  );
}

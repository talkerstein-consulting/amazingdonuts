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
import { customDonutCartItem, dozenCartItem, indexCatalog } from "./lib/squareCart.js";
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
  const full = box.slots.every(Boolean);
  const squareIndex = useMemo(() => indexCatalog(catalog), [catalog]);

  useEffect(() => {
    fetch("/api/catalog")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Square catalog unavailable.");
        setCatalog(body);
      })
      .catch((error) => setCatalogError(error.message));
  }, []);

  const add = useCallback((product) => dispatch({ type: "add", product }), []);
  const removeAt = useCallback((index) => dispatch({ type: "remove", index }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  const addFromMachine = useCallback(
    (product) => {
      if (full) return false;
      add(product);
      document.querySelector(".dbox__base")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return true;
    },
    [add, full]
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

  return (
    <>
      <Masthead />
      <main>
        <Hero24 />
        <Ticker lines={TICKER_TOP} />
        <Certifications />
        <BuildABox
          box={box}
          limit={BOX_LIMIT}
          add={add}
          removeAt={removeAt}
          reset={reset}
          onAddToCart={addDozenToCart}
          orderingReady={Boolean(catalog) && !catalogError}
        />
        <DonutBuilder onAddToCart={addCustomToCart} orderingReady={Boolean(catalog) && !catalogError} />
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
      />
      {catalogError ? <p className="order-toast" role="alert">{catalogError}</p> : null}
    </>
  );
}

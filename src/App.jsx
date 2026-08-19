import { useCallback, useReducer } from "react";
import Masthead from "./components/Masthead.jsx";
import { Hero24 } from "./components/hero-24.tsx";
import Ticker from "./components/Ticker.jsx";
import BuildABox from "./components/BuildABox.jsx";
import DonutBuilder from "./components/DonutBuilder.jsx";
import JackpotSlot from "./components/JackpotSlot.jsx";
import { Features12 } from "./components/features-12.tsx";
import Contact9 from "./components/contact-9.tsx";
import { Footer5 } from "./components/footer-5.tsx";
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
  const full = box.slots.every(Boolean);

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

  return (
    <>
      <Masthead />
      <main>
        <Hero24 />
        <Ticker lines={TICKER_TOP} />
        <Certifications />
        <BuildABox box={box} limit={BOX_LIMIT} add={add} removeAt={removeAt} reset={reset} />
        <DonutBuilder />
        <JackpotSlot onTake={addFromMachine} boxFull={full} />
        <Categories />
        <CustomPrint />
        <Features12 />
        <InkPanel />
        <Contact9 />
      </main>
      <Footer5 />
    </>
  );
}

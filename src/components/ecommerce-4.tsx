"use client";

/**
 * React Bits Pro `ecommerce-4`, rebuilt as the product cabinet.
 *
 * Kept from the block: the product layout — eyebrow, big name, price, a row of
 * fact chips, the accordion detail sections, and one full-width primary action.
 * Changed: it slides in from the right over the page instead of sitting as a
 * section, the artwork is a cutout on a family wash, and the primary action
 * puts the item in the box. Flat colour throughout — no shadows, no gradients.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X } from "lucide-react";
import Wedge from "./Wedge.jsx";

const FACTS = ["KOSHER PAREVE · COR 483", "NUT FREE", "SESAME FREE", "DAIRY FREE", "BAKED ON SITE"];

const CATEGORY_LABEL = {
  donuts: "Donuts",
  muffins: "Muffins",
  cupcakes: "Cupcakes",
  cookies: "Cookies & Squares",
  cakes: "Donut Cakes",
  breads: "Challah & Breads"
};

function sections(product) {
  return [
    {
      label: "What it is",
      body: `${product.name}${product.sub ? ` — ${product.sub}` : ""}. Mixed, fried or baked and finished on site the morning you buy it. ${product.price} each.`
    },
    {
      label: "Who can eat it",
      body: "Everyone at the table. No tree nuts, peanuts or sesame come through our door, and everything we bake is pareve, so it lands after a meat meal or a dairy one."
    },
    {
      label: "Ordering",
      body: "Single pieces over the counter, no notice needed. For a dozen or more, or anything printed or lettered, call ahead — (416) 398-7546. Special-order items need a day or two."
    }
  ];
}

export default function Ecommerce4({ product, onClose, onAdd, boxFull }) {
  const [open, setOpen] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setOpen(0);
    setAdded(false);
  }, [product]);

  /* Escape closes it, and the page behind must not scroll while it is open. */
  useEffect(() => {
    if (!product) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [product, onClose]);

  return (
    <AnimatePresence>
      {product ? (
        <motion.div
          className="cabinet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button className="cabinet__scrim" aria-label="Close" onClick={onClose} />

          <motion.aside
            className="cabinet__panel"
            data-family={product.family || "sky"}
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <button className="cabinet__close" onClick={onClose} aria-label="Close">
              <X />
            </button>

            <div className="cabinet__art">
              <img src={"/" + product.img} alt={product.name} />
            </div>

            <div className="cabinet__body">
              <p className="eyebrow">{CATEGORY_LABEL[product.cat] || "From the case"}</p>
              <h3 className="display cabinet__name">{product.name}</h3>
              {product.sub ? <p className="cabinet__sub">{product.sub}</p> : null}
              <p className="cabinet__price">{product.price}</p>

              <div className="cabinet__facts">
                {FACTS.map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </div>

              <div className="cabinet__acts">
                <button
                  type="button"
                  className="cabinet__add"
                  disabled={boxFull}
                  onClick={() => {
                    if (onAdd(product)) setAdded(true);
                  }}
                >
                  <Plus />
                  {boxFull ? "The box is full" : added ? "In the box — add another" : "Put it in my box"}
                </button>
                <Wedge label="Call the Bakery" href="tel:+14163987546" family="magenta" small />
              </div>

              <div className="cabinet__sections">
                {sections(product).map((s, i) => (
                  <div key={s.label}>
                    <button
                      type="button"
                      className="cabinet__row"
                      aria-expanded={open === i}
                      onClick={() => setOpen(open === i ? -1 : i)}
                    >
                      {s.label}
                      <Plus data-open={open === i} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open === i ? (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          style={{ overflow: "hidden" }}
                        >
                          <p className="cabinet__copy">{s.body}</p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

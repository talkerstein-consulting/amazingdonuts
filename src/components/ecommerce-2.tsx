"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";

type Product = {
  name: string;
  price: string;
  tag: "Bestseller" | "New" | null;
  brand: string;
  colors: string[];
  chips: string[];
  image: string;
};

const products: Product[] = [
  {
    name: "Slim Air Fryer 4qt",
    price: "$59.99",
    tag: "Bestseller",
    brand: "Hearth",
    colors: ["#111", "#e7e2d8", "#3f5c4a", "#8b3a2f"],
    chips: ["Fits-anywhere", "EverGood"],
    image:
      "https://images.unsplash.com/photo-1585515320310-259814833e62?w=1200&q=80",
  },
  {
    name: "2-Slice Slim Toaster",
    price: "$24.99",
    tag: "Bestseller",
    brand: "Hearth",
    colors: ["#111", "#e7e2d8", "#3f5c4a", "#8b3a2f"],
    chips: ["Fits-anywhere"],
    image:
      "https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=1200&q=80",
  },
  {
    name: "PRO Air Fryer 4qt",
    price: "$69.99",
    tag: "Bestseller",
    brand: "Hearth PRO",
    colors: ["#111", "#e7e2d8"],
    chips: ["EverGood", "Premium", "Fits-anywhere"],
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80",
  },
  {
    name: "XL Griddle with Tray",
    price: "$64.99",
    tag: "Bestseller",
    brand: "Hearth Kitchenware",
    colors: ["#111"],
    chips: ["Family size", "EverGood"],
    image:
      "https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=1200&q=80",
  },
  {
    name: "SmartCrisp 8qt Air Fryer",
    price: "$129.99",
    tag: "Bestseller",
    brand: "Hearth PRO",
    colors: ["#111", "#e7e2d8", "#8b3a2f"],
    chips: ["Family size", "EverGood", "Premium"],
    image:
      "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=1200&q=80",
  },
  {
    name: "4-Slice Toaster",
    price: "$59.99",
    tag: "New",
    brand: "So Cozy by Hearth",
    colors: ["#111", "#e7e2d8", "#3f5c4a"],
    chips: [],
    image:
      "https://images.unsplash.com/photo-1586941962765-d3896cc85ac8?w=1200&q=80",
  },
];

const brands = [
  "Hearth",
  "Hearth Kitchenware",
  "Hearth PRO",
  "So Cozy by Hearth",
];
const filterSections = ["Brand", "Feature", "Color", "Type"];

export default function Ecommerce2() {
  const [expanded, setExpanded] = useState<string>("Brand");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<"all" | "new">("all");

  const shown = useMemo(() => {
    const active = Object.keys(checked).filter((k) => checked[k]);
    let list = products;
    if (view === "new") list = list.filter((p) => p.tag === "New");
    if (active.length) list = list.filter((p) => active.includes(p.brand));
    return list;
  }, [checked, view]);

  return (
    <section className="w-full min-h-[var(--rb-section-min-h,100vh)] py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-950">
      <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <aside className="space-y-5 text-sm">
          <div className="space-y-3">
            <button
              onClick={() => setView("all")}
              className={`block text-left font-medium cursor-pointer transition-colors ${
                view === "all"
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Shop all
            </button>
            <button
              onClick={() => setView("new")}
              className={`flex items-center justify-between w-full font-medium cursor-pointer transition-colors ${
                view === "new"
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              New
              <span className="h-6 w-6 grid place-items-center text-[11px] rounded border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
                {products.filter((p) => p.tag === "New").length}
              </span>
            </button>
          </div>

          {filterSections.map((f) => (
            <div
              key={f}
              className="border-t border-neutral-200 dark:border-neutral-800 pt-4"
            >
              <button
                onClick={() => setExpanded(expanded === f ? "" : f)}
                className="flex items-center justify-between w-full text-neutral-900 dark:text-white font-medium cursor-pointer"
              >
                {f}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${expanded === f ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {expanded === f && f === "Brand" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2">
                      {brands.map((b) => (
                        <label
                          key={b}
                          className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={!!checked[b]}
                            onChange={() =>
                              setChecked((c) => ({ ...c, [b]: !c[b] }))
                            }
                            className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 accent-neutral-900 dark:accent-white"
                          />
                          {b}
                        </label>
                      ))}
                      <button
                        onClick={() => setChecked({})}
                        className="block text-right text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white mt-2 ml-auto cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </aside>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {shown.map((p, i) => (
              <motion.article
                key={p.name}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{
                  layout: { type: "spring", stiffness: 260, damping: 30 },
                  duration: 0.35,
                  delay: i * 0.03,
                }}
                className="flex flex-col gap-2 group"
              >
                <div className="relative aspect-square rounded-2xl bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                  {p.tag === "New" && (
                    <span className="absolute top-3 left-3 z-10 px-3 py-1 rounded-md bg-white dark:bg-neutral-800 text-[11px] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                      New
                    </span>
                  )}
                  <img
                    src={p.image}
                    alt=""
                    className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
                {p.tag === "Bestseller" && (
                  <p className="text-[11px] tracking-wide text-neutral-500 dark:text-neutral-400">
                    Bestseller
                  </p>
                )}
                <p className="text-sm font-medium text-neutral-900 dark:text-white leading-tight">
                  {p.name}
                </p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {p.price}
                </p>
                <div className="flex items-center gap-2">
                  {p.colors.map((c) => (
                    <span
                      key={c}
                      style={{ backgroundColor: c }}
                      className="h-4 w-4 rounded-full ring-1 ring-neutral-200 dark:ring-neutral-700"
                    />
                  ))}
                </div>
                {p.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.chips.map((c) => (
                      <span
                        key={c}
                        className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-700 dark:text-neutral-300"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

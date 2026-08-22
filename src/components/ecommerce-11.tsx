"use client";

import { useMemo, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { ArrowLeft, Gift, Lock, Minus, Plus, X } from "lucide-react";

type CartItem = {
  name: string;
  variant: string;
  price: number;
  quantity: number;
};

const initialItems: CartItem[] = [
  { name: "Transit Parka", variant: "Graphite · M", price: 310, quantity: 1 },
  { name: "Merino Rib Crew", variant: "Oat · M", price: 148, quantity: 1 },
  { name: "Loop Sling", variant: "Bone · One size", price: 86, quantity: 1 },
];

const freeShippingAt = 500;

export default function Ecommerce11() {
  const [items, setItems] = useState(initialItems);
  const [giftNote, setGiftNote] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );
  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );
  const shippingFree = subtotal >= freeShippingAt;
  const shipping = items.length === 0 || shippingFree ? 0 : 12;
  const total = subtotal + shipping;
  const progress = Math.min(subtotal / freeShippingAt, 1);

  const updateQuantity = (name: string, amount: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.name === name
            ? { ...item, quantity: Math.max(0, item.quantity + amount) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 },
    },
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section className="w-full bg-white dark:bg-neutral-950 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-10 lg:gap-16 items-start"
      >
        <div>
          <motion.div
            variants={fadeUp}
            className="flex items-baseline justify-between gap-6"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight text-neutral-900 dark:text-white">
              Your bag
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              <span className="tabular-nums">{itemCount}</span>{" "}
              {itemCount === 1 ? "item" : "items"}
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-6 border-t border-neutral-200 dark:border-neutral-800"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {items.map((item) => (
                <motion.article
                  key={item.name}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
                  }}
                  transition={{
                    duration: 0.35,
                    ease: [0.22, 1, 0.36, 1],
                    layout: {
                      duration: prefersReducedMotion ? 0 : 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }}
                  className="grid grid-cols-[80px_minmax(0,1fr)_auto] gap-4 sm:gap-6 border-b border-neutral-200 dark:border-neutral-800 py-6"
                >
                  <div className="w-20 aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
                    <img
                      src="/svg/placeholder.svg"
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col justify-between py-0.5">
                    <div>
                      <h3 className="truncate text-[15px] font-medium text-neutral-900 dark:text-white">
                        {item.name}
                      </h3>
                      <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                        {item.variant}
                      </p>
                    </div>
                    <div className="flex h-9 w-fit items-center rounded-full border border-neutral-300 dark:border-neutral-700">
                      <button
                        onClick={() => updateQuantity(item.name, -1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="grid h-full w-9 place-items-center rounded-l-full text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-sm font-medium tabular-nums text-neutral-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.name, 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="grid h-full w-9 place-items-center rounded-r-full text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between py-0.5">
                    <p className="text-[15px] font-medium tabular-nums text-neutral-900 dark:text-white">
                      ${item.price * item.quantity}
                    </p>
                    <button
                      onClick={() => updateQuantity(item.name, -item.quantity)}
                      aria-label={`Remove ${item.name} from bag`}
                      className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.article>
              ))}
              {items.length === 0 && (
                <motion.div
                  key="empty"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="border-b border-neutral-200 dark:border-neutral-800 py-16 text-center"
                >
                  <p className="text-lg font-medium text-neutral-900 dark:text-white">
                    Your bag is empty
                  </p>
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    Everything you saved is still waiting in the collection.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.a
            variants={fadeUp}
            href="#"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </motion.a>
        </div>

        <motion.aside
          variants={fadeUp}
          className="lg:sticky lg:top-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-6 sm:p-8"
        >
          <h3 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
            Summary
          </h3>

          <div className="mt-5">
            <p
              className="text-sm text-neutral-600 dark:text-neutral-400"
              aria-live="polite"
            >
              {shippingFree ? (
                "Free express shipping unlocked"
              ) : (
                <>
                  Add{" "}
                  <span className="font-medium tabular-nums text-neutral-900 dark:text-white">
                    ${freeShippingAt - subtotal}
                  </span>{" "}
                  for free express shipping
                </>
              )}
            </p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: progress }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="h-full w-full origin-left rounded-full bg-neutral-900 dark:bg-white"
              />
            </div>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-baseline justify-between text-neutral-600 dark:text-neutral-400">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">${subtotal}</dd>
            </div>
            <div className="flex items-baseline justify-between text-neutral-600 dark:text-neutral-400">
              <dt>Express shipping</dt>
              <dd className="tabular-nums">
                {items.length === 0 ? "-" : shippingFree ? "Free" : "$12"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between text-neutral-600 dark:text-neutral-400">
              <dt>Duties &amp; taxes</dt>
              <dd>Included</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-neutral-200 dark:border-neutral-800 pt-4 text-base font-semibold text-neutral-900 dark:text-white">
              <dt>Total</dt>
              <dd className="tabular-nums">${total}</dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-neutral-200 dark:border-neutral-800 pt-5">
            <button
              onClick={() => setGiftNote((value) => !value)}
              aria-expanded={giftNote}
              className="flex w-full items-center justify-between gap-4 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded-xl"
            >
              <span className="flex items-center gap-3">
                <Gift className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  Add a gift note
                </span>
              </span>
              <motion.span
                animate={{ rotate: giftNote ? 45 : 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.25,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {giftNote && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.35,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="overflow-hidden"
                >
                  <textarea
                    rows={3}
                    placeholder="Written by hand on our studio card, then tucked inside."
                    aria-label="Gift note"
                    className="mt-4 w-full resize-none rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-3.5 text-sm leading-relaxed text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={
              prefersReducedMotion || items.length === 0
                ? undefined
                : { scale: 0.98 }
            }
            disabled={items.length === 0}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full bg-black dark:bg-white px-6 py-4 text-sm sm:text-base font-medium text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
          >
            <Lock className="h-4 w-4" />
            Continue to checkout
          </motion.button>

          <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Apple Pay · Shop Pay · Visa · Mastercard
          </p>
        </motion.aside>
      </motion.div>
    </section>
  );
}

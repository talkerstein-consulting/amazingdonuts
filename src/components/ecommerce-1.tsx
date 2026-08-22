"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Heart, ChevronDown } from "lucide-react";

const views = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80",
  "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=1200&q=80",
  "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1200&q=80",
  "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=1200&q=80",
  "https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?w=1200&q=80",
  "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1200&q=80",
];

export default function Ecommerce1() {
  const [thumb, setThumb] = useState(0);
  const [fit, setFit] = useState<"standard" | "custom">("standard");
  const [materials, setMaterials] = useState(false);
  const [description, setDescription] = useState(false);
  const [liked, setLiked] = useState(false);

  return (
    <section className="w-full min-h-[var(--rb-section-min-h,100vh)] py-6 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-950">
      <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="relative rounded-3xl bg-neutral-100 dark:bg-neutral-900 overflow-hidden aspect-4/5 sm:aspect-4/3 lg:aspect-auto lg:min-h-[720px]">
          <div className="absolute top-5 left-5 flex items-center gap-2 z-20">
            <button className="inline-flex items-center gap-1 pl-3 pr-4 py-2 rounded-full bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm font-medium shadow-sm cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <span className="px-3 py-2 rounded-full bg-white/80 dark:bg-neutral-800/80 backdrop-blur text-neutral-700 dark:text-neutral-300 text-xs tracking-wide">
              Low stock
            </span>
          </div>

          <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-4 flex flex-row gap-2 lg:left-5 lg:translate-x-0 lg:bottom-auto lg:top-24 lg:flex-col">
            {views.map((src, i) => (
              <button
                key={src}
                onClick={() => setThumb(i)}
                className={`h-10 w-10 lg:h-14 lg:w-14 rounded-lg lg:rounded-xl overflow-hidden transition cursor-pointer ${
                  thumb === i
                    ? "ring-2 ring-white ring-offset-0 shadow-md"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.img
              key={thumb}
              src={views[thumb]}
              alt=""
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-neutral-900 dark:bg-white grid place-items-center shrink-0">
              <span className="text-white dark:text-neutral-900 text-xs font-bold tracking-tight">
                AR
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                Runner Ash01
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                By{" "}
                <a href="#" className="underline">
                  ARC ATHLETIC
                </a>
              </p>
            </div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              $184
            </p>
          </div>

          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-3 flex gap-2">
            {views.slice(0, 4).map((src, i) => (
              <button
                key={src}
                onClick={() => setThumb(i)}
                className={`h-16 flex-1 rounded-xl overflow-hidden transition cursor-pointer ${
                  thumb === i
                    ? "ring-2 ring-neutral-900 dark:ring-white"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-5">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              Size
            </p>
            <button
              onClick={() => setFit("standard")}
              className={`mt-3 w-full py-3 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                fit === "standard"
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                  : "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white ring-1 ring-neutral-200 dark:ring-neutral-700"
              }`}
            >
              Standard sizes
            </button>
            <div className="my-3 flex items-center gap-3">
              <span className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
              <span className="text-xs text-neutral-500">or</span>
              <span className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <button
              onClick={() => setFit("custom")}
              className={`w-full py-3 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                fit === "custom"
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                  : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 ring-1 ring-neutral-200 dark:ring-neutral-700"
              }`}
            >
              Custom-fit to my foot scan
            </button>
          </div>

          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-5">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              <span className="text-neutral-900 dark:text-white font-medium">
                Delivery
              </span>{" "}
              ships in 3&ndash;4 days
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => setLiked((v) => !v)}
                className="grid place-items-center h-12 w-12 rounded-xl bg-white dark:bg-neutral-800 ring-1 ring-neutral-200 dark:ring-neutral-700 text-neutral-900 dark:text-white cursor-pointer"
                aria-label="Favorite"
              >
                <Heart
                  className={`h-4 w-4 transition ${liked ? "fill-rose-500 text-rose-500" : ""}`}
                />
              </button>
              <button className="flex-1 h-12 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold hover:opacity-90 transition cursor-pointer">
                Add to bag
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
            <button
              onClick={() => setMaterials((v) => !v)}
              className="w-full flex items-center justify-between p-5 text-sm font-medium text-neutral-900 dark:text-white cursor-pointer"
            >
              Materials
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${materials ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {materials && (
                <motion.div
                  key="materials"
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="px-5 pb-5 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed"
                  >
                    Knit upper in 63% recycled polyester, bio-foam midsole,
                    organic cotton lining.
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
            <div
              className={`${materials ? "" : "border-t border-neutral-200 dark:border-neutral-800"}`}
            >
              <button
                onClick={() => setDescription((v) => !v)}
                className="w-full flex items-center justify-between p-5 text-sm font-medium text-neutral-900 dark:text-white cursor-pointer"
              >
                Description
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ${description ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {description && (
                  <motion.div
                    key="description"
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, delay: 0.05 }}
                      className="px-5 pb-5 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      An everyday performance silhouette, engineered for long
                      days and longer routes.
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

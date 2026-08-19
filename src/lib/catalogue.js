import { PRODUCTS } from "../data/products.js";

export const CATEGORIES = [
  { id: "donuts", label: "Donuts" },
  { id: "muffins", label: "Muffins" },
  { id: "cupcakes", label: "Cupcakes" },
  { id: "cookies", label: "Cookies & Squares" },
  { id: "cakes", label: "Donut Cakes" },
  { id: "breads", label: "Challah & Breads" }
];

export const FAMILIES = ["sky", "magenta", "sunshine"];

/** Absolute path into /public, so components never guess at the asset root. */
export const asset = (path) => "/" + String(path || "").replace(/^\/+/, "");

export const byId = (id) => PRODUCTS.find((p) => p.id === id);

export const cutouts = () => PRODUCTS.filter((p) => p.mode === "cutout");

/** Single pieces — a multipack is a poor answer to "what should I eat". */
export const singles = () =>
  cutouts().filter((p) => !/twelve|dozen|6-pack|bulk|petite/i.test(`${p.id} ${p.name}`));

export const money = (p) => parseFloat(String(p?.price || "").replace(/[^0-9.]/g, "")) || 0;

export const inCategory = (id) => PRODUCTS.filter((p) => p.cat === id);

/** The tile image: never the "your design here" printed sample. */
export const categoryFace = (id) => {
  const items = inCategory(id);
  return (
    items.find((p) => p.mode === "cutout" && !/custom|printed/i.test(p.name)) ||
    items.find((p) => p.mode === "cutout") ||
    null
  );
};

export { PRODUCTS };

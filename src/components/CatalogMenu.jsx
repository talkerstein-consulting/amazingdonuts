import { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { PRODUCTS as LEGACY_PRODUCTS } from "../data/products.js";
import { catalogCartItem } from "../lib/squareCart.js";

const currency = (money) => money ? new Intl.NumberFormat("en-CA", {
  style: "currency", currency: money.currency || "CAD"
}).format(Number(money.amount || 0) / 100) : "Price unavailable";

const normalized = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function fallbackImage(product) {
  const name = normalized(product.name);
  const match = LEGACY_PRODUCTS.find((candidate) => normalized(candidate.name) === name)
    || LEGACY_PRODUCTS.find((candidate) => name.includes(normalized(candidate.name)) || normalized(candidate.name).includes(name));
  return match ? `/${match.img}` : "/assets/logo-amazing-donuts.webp";
}

function ProductDialog({ product, modifierLists, onClose, onAdd }) {
  const available = product.variations.filter((variation) => !variation.soldOut && variation.priceMoney);
  const [variationId, setVariationId] = useState(available[0]?.id || "");
  const [selected, setSelected] = useState({});
  const variation = available.find((item) => item.id === variationId);
  const lists = product.modifierListIds
    .filter((info) => info.enabled)
    .map((info) => ({ ...info, list: modifierLists.find((list) => list.id === info.id) }))
    .filter((info) => info.list && !info.list.name.startsWith("Builder:"));
  const chosen = lists.flatMap(({ list }) => list.modifiers.filter((modifier) => !modifier.soldOut && selected[list.id]?.includes(modifier.id)));
  const requirementsMet = lists.every(({ list, minSelected }) => (selected[list.id]?.length || 0) >= Number(minSelected || 0));
  const custom = product.variations.some((item) => item.sku === "DSPCL-SPR");
  const imageUrl = product.imageUrl || fallbackImage(product);

  const toggle = (info, modifierId) => {
    setSelected((current) => {
      const values = current[info.list.id] || [];
      if (info.list.selectionType === "SINGLE") return { ...current, [info.list.id]: [modifierId] };
      if (values.includes(modifierId)) return { ...current, [info.list.id]: values.filter((id) => id !== modifierId) };
      const max = Number(info.maxSelected ?? Infinity);
      return values.length >= max ? current : { ...current, [info.list.id]: [...values, modifierId] };
    });
  };

  return (
    <div className="menu-dialog" role="dialog" aria-modal="true" aria-labelledby="menu-product-title">
      <button className="menu-dialog__scrim" type="button" aria-label="Close product" onClick={onClose} />
      <section className="menu-dialog__panel">
        <button className="menu-dialog__close" type="button" onClick={onClose} aria-label="Close product" title="Close"><X /></button>
        <div className="menu-dialog__art"><img src={imageUrl} alt="" /></div>
        <div className="menu-dialog__body">
          <p className="eyebrow">Square menu</p>
          <h3 id="menu-product-title">{product.name}</h3>
          {product.description ? <p className="menu-dialog__description">{product.description}</p> : null}

          {custom ? (
            <a className="menu-dialog__add" href="#build-your-own" onClick={onClose}>Open the donut builder</a>
          ) : (
            <>
              {product.variations.length > 1 ? <fieldset className="menu-options"><legend>Choose a size</legend>{product.variations.map((item) => (
                <label key={item.id} className={item.soldOut ? "is-disabled" : ""}>
                  <input type="radio" name="variation" value={item.id} checked={variationId === item.id} disabled={item.soldOut || !item.priceMoney} onChange={() => setVariationId(item.id)} />
                  <span>{item.name}</span><strong>{item.soldOut ? "Sold out" : currency(item.priceMoney)}</strong>
                </label>
              ))}</fieldset> : null}

              {lists.map((info) => <fieldset className="menu-options" key={info.list.id}>
                <legend>{info.list.name}{info.minSelected ? <small>Choose {info.minSelected}</small> : <small>Optional</small>}</legend>
                {info.list.modifiers.map((modifier) => {
                  const active = selected[info.list.id]?.includes(modifier.id);
                  return <label key={modifier.id} className={modifier.soldOut ? "is-disabled" : ""}>
                    <input type={info.list.selectionType === "SINGLE" ? "radio" : "checkbox"} name={info.list.id} checked={Boolean(active)} disabled={modifier.soldOut} onChange={() => toggle(info, modifier.id)} />
                    <span>{active ? <Check aria-hidden="true" /> : null}{modifier.name}</span>
                    <strong>{modifier.soldOut ? "Sold out" : modifier.priceMoney?.amount ? `+${currency(modifier.priceMoney)}` : "Included"}</strong>
                  </label>;
                })}
              </fieldset>)}

              <button className="menu-dialog__add" type="button" disabled={!variation || !requirementsMet} onClick={() => {
                onAdd(catalogCartItem({ product, variation, modifiers: chosen, imageUrl }));
                onClose();
              }}><ShoppingBag aria-hidden="true" /> {variation ? `Add · ${currency({ amount: Number(variation.priceMoney.amount) + chosen.reduce((sum, item) => sum + Number(item.priceMoney?.amount || 0), 0), currency: variation.priceMoney.currency })}` : "Unavailable"}</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default function CatalogMenu({ catalog, error, onAdd }) {
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const categories = useMemo(() => [...(catalog?.categories || [])].sort((a, b) => (a.ordinal ?? 999) - (b.ordinal ?? 999) || a.name.localeCompare(b.name)), [catalog]);
  const products = useMemo(() => (catalog?.products || []).filter((product) => category === "all" || product.categoryIds.includes(category)), [catalog, category]);

  return (
    <section className="catalog-menu" id="menu" aria-labelledby="menu-title">
      <div className="wrap">
        <header className="catalog-menu__head">
          <div><p className="eyebrow">Order the bakery case</p><h2 id="menu-title">Today’s full menu.</h2></div>
          <p>Availability and pricing come straight from Square.</p>
        </header>
        {error ? <p className="catalog-menu__status" role="alert">{error}</p> : !catalog ? <p className="catalog-menu__status">Loading today’s case…</p> : (
          <>
            <div className="catalog-tabs" role="tablist" aria-label="Menu categories">
              <button type="button" role="tab" aria-selected={category === "all"} onClick={() => setCategory("all")}>Everything</button>
              {categories.map((item) => <button type="button" role="tab" aria-selected={category === item.id} key={item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}
            </div>
            <div className="catalog-grid">
              {products.map((product) => {
                const available = product.variations.filter((item) => !item.soldOut && item.priceMoney);
                const from = available.sort((a, b) => a.priceMoney.amount - b.priceMoney.amount)[0];
                return <article className="catalog-card" key={product.id}>
                  <button type="button" onClick={() => setSelectedProduct(product)} disabled={!available.length} aria-label={`${product.name}, ${available.length ? `from ${currency(from.priceMoney)}` : "sold out"}`}>
                    <div className="catalog-card__art"><img src={product.imageUrl || fallbackImage(product)} alt="" /></div>
                    <div className="catalog-card__copy"><h3>{product.name}</h3><p>{available.length ? `${product.variations.length > 1 ? "From " : ""}${currency(from.priceMoney)}` : "Sold out"}</p></div>
                    <span className="catalog-card__plus" aria-hidden="true">{available.length ? <Plus /> : <Minus />}</span>
                  </button>
                </article>;
              })}
            </div>
          </>
        )}
      </div>
      {selectedProduct ? <ProductDialog product={selectedProduct} modifierLists={catalog.modifierLists || []} onClose={() => setSelectedProduct(null)} onAdd={onAdd} /> : null}
    </section>
  );
}

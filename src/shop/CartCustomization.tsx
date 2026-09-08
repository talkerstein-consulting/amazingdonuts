import { boxMaxFor, BULK_PACK_SIZES, customizationFor, PETITE_TYPES, type Customization } from '../lib/custom-order';
import { PRINT_SPRINKLE_SWATCHES, swatchesFor } from '../lib/petite-palette';
import { PRODUCTS } from '../data/products';

/**
 * What a bag line was specified as — read back, never re-asked.
 *
 * Every kind here is chosen on the product's own page: the box is filled in the
 * builder, the cake's shape is cut from the bakery's own lists, the petite
 * tray's colours are picked from the lab's palette, and the printed dozen's
 * icing, sprinkles and artwork are now uploaded there too. A cart line states
 * the answers so they can be checked before checkout; it does not ask the
 * questions, because a required field on a bag row asks after the sale.
 */
export default function CartCustomization({productId,qty,value}:{productId:string;qty:number;value?:Customization;onChange?:(next:Customization)=>void}){
  const customization=value||customizationFor(productId);
  if(!customization)return null;
  /* The box is chosen on its own page and only shown here — there is no way to
     re-pick six donuts inside a cart line, and the six that were picked are
     what the line is. */
  if(customization.kind==='box')return <div className="cart-custom"><div className="cart-custom__head"><strong>In this box</strong><span>{customization.donuts.length}/{boxMaxFor(productId)||customization.donuts.length}</span></div><ul className="cart-box-list">{customization.donuts.map((id,index)=>{const donut=PRODUCTS.find(item=>item.id===id);return donut?<li key={`${id}-${index}`}><img src={donut.img} alt=""/><span>{donut.name}</span></li>:null})}</ul></div>;
  /* The Donut Lab's build, read back as the steps that made it. Priced per
     element — see LAB_ELEMENT_PRICE, which is a placeholder until the bakery
     prices the builder. Read-only, like the box: the spec was set in the lab
     and there is nothing here to re-choose. */
  if(customization.kind==='lab')return <div className="cart-custom"><div className="cart-custom__head"><strong>Your build</strong><span>{customization.elements.length} element{customization.elements.length===1?'':'s'}</span></div><ul className="cart-spec">{customization.elements.map(el=><li key={el.label}><span>{el.label}</span><strong>{el.value}</strong><b>{el.price?`+$${el.price.toFixed(2)}`:'—'}</b></li>)}</ul></div>;
  /* Read-only. The shape is chosen on the cake's own page from dropdowns of
     what the bakery can actually cut — see `CakeBuilder` — so a free-text field
     here would let somebody type past that constraint after the fact. */
  /* The petite tray's finish, read back. Chosen on the product page — a
     required colour field on a cart line asks the question after the sale. */
  if(customization.kind==='petite'){const type=PETITE_TYPES.find(t=>t.id===customization.type);const swatch=swatchesFor(type?.palette??null).find(sw=>sw.id===customization.colourId);return <div className="cart-custom"><div className="cart-custom__head"><strong>Finish</strong><span>{qty*(BULK_PACK_SIZES.get(productId)??1)} donuts</span></div><ul className="cart-spec"><li><span>Type</span><strong>{type?.label}</strong><b/></li>{type?.asks&&<li><span>Colours</span><strong>{customization.colours}</strong><b className="cart-spec__dots">{swatch?.dots.map((d,i)=><i key={i} style={{background:d}}/>)}</b></li>}</ul></div>;}
  if(customization.kind==='glyph')return <div className="cart-custom"><div className="cart-custom__head"><strong>Cut as</strong><span>{customization.glyph.length} {customization.glyph.length===1?'cake':'cakes'}</span></div><p className="cart-glyph-value">{customization.glyph}</p></div>;
  /* The printed dozen, read back. Chosen on the product page — the artwork
     especially, because uploading a file is the one choice that can fail, and
     a checkout is the wrong place to discover that. */
  const sprinkle=PRINT_SPRINKLE_SWATCHES.find(sw=>sw.id===customization.sprinkleId);
  const assigned=customization.artworks.reduce((sum,art)=>sum+art.count,0);
  return <div className="cart-custom"><div className="cart-custom__head"><strong>Your print</strong><span>{assigned}/{qty} dozen</span></div><ul className="cart-spec"><li><span>Icing</span><strong>{customization.icingFlavour||'—'}</strong><b/></li><li><span>Sprinkles</span><strong>{customization.sprinkleColours||'None'}</strong><b className="cart-spec__dots">{sprinkle?.dots.map((d,i)=><i key={i} style={{background:d}}/>)}</b></li></ul><ul className="cart-box-list cart-box-list--art">{customization.artworks.map((art,index)=><li key={art.key}><img src={art.dataUrl} alt=""/><span>Design {index+1} · {art.count} dozen</span></li>)}</ul></div>;
}

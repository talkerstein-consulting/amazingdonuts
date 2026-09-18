import test from "node:test";
import assert from "node:assert/strict";
import { availableAtLocation, variationAtLocation, variationPrice } from "../apps/api/catalog-availability.js";
import { buildSquareOrder, storefrontCatalogCategories, storefrontCatalogProducts, storefrontCatalogProductsWithDiscounts } from "../apps/api/app.js";
import { lineKeyOf } from "../../../src/lib/cart-line.ts";
import { mergeSquareCatalog } from "../../../src/lib/live-catalog.ts";

const fixture = () => ({ type: "ITEM", id: "ITEM", item_data: { name: "Banana Muffin", variations: [{ id: "VAR", item_variation_data: { price_money: { amount: 275, currency: "CAD" }, location_overrides: [{ location_id: "STORE", price_money: { amount: 300, currency: "CAD" } }] } }] } });
const fulfillment = { type: "pickup", scheduledAt: "2026-10-05T14:00:00Z", recipient: { displayName: "Test Customer", email: "test@example.com", phone: "4165550123" } };

test("live catalog honors location prices and active sold-out overrides", () => {
  const item = fixture(), variation = variationAtLocation(item, "STORE"), override = variation.item_variation_data.location_overrides[0];
  assert.equal(variationPrice(variation, "STORE").amount, 300);
  assert.equal(variationPrice(variation, "OTHER").amount, 275);
  override.sold_out = true;
  assert.equal(availableAtLocation(item, variation, "STORE"), false);
  assert.equal(availableAtLocation(item, variation, "OTHER"), true);
  override.sold_out_valid_until = "2020-01-01T00:00:00Z";
  assert.equal(availableAtLocation(item, variation, "STORE"), true);
});

test("storefront catalog reads current item categories from Square", () => {
  const item=fixture();
  item.item_data.categories=[{id:"DONUTS",ordinal:2}];
  const objects=[item,{type:"CATEGORY",id:"DONUTS",category_data:{name:"Donuts",category_type:"REGULAR_CATEGORY"}}];
  assert.equal(storefrontCatalogProducts(objects,"STORE")[0].category,"Donuts");
  item.item_data.categories=[{id:"BREADS",ordinal:1}];
  objects.push({type:"CATEGORY",id:"BREADS",category_data:{name:"Breads",category_type:"REGULAR_CATEGORY"}});
  assert.equal(storefrontCatalogProducts(objects,"STORE")[0].category,"Breads");
});

test("storefront catalog uses Square's ordered product images", () => {
  const item=fixture();
  item.item_data.image_ids=["PRIMARY","SECONDARY"];
  const products=storefrontCatalogProducts([item,
    {type:"IMAGE",id:"PRIMARY",image_data:{url:"https://square.example/primary.jpg"}},
    {type:"IMAGE",id:"SECONDARY",image_data:{url:"https://square.example/secondary.jpg"}}
  ],"STORE");
  assert.equal(products[0].img,"https://square.example/primary.jpg");
  assert.deepEqual(products[0].secondary,["https://square.example/secondary.jpg"]);
});

test("storefront catalog ignores Square menu-category duplicates", () => {
  const item=fixture();
  item.item_data.categories=[{id:"MENU"}];
  const products=storefrontCatalogProducts([item,{type:"CATEGORY",id:"MENU",category_data:{name:"Donuts",category_type:"MENU_CATEGORY"}}],"STORE");
  assert.equal(products[0].category,undefined);
});

test("storefront category navigation mirrors Square additions, renames and removals", () => {
  const regular=name=>({type:"CATEGORY",id:name,category_data:{name,category_type:"REGULAR_CATEGORY"}});
  assert.deepEqual(storefrontCatalogCategories([regular("Donuts"),regular("New Treats")]),["Donuts","New Treats"]);
  assert.deepEqual(storefrontCatalogCategories([regular("Pastries")]),["Pastries"]);
  assert.deepEqual(storefrontCatalogCategories([{...regular("Deleted"),is_deleted:true}]),[]);
});

test("storefront category navigation follows Square's category order", () => {
  const category=(name,ordinal)=>({type:"CATEGORY",id:name,category_data:{name,category_type:"REGULAR_CATEGORY",is_top_level:true,parent_category:{ordinal}}});
  assert.deepEqual(storefrontCatalogCategories([
    category("Breads",30),
    category("Donuts",10),
    category("Cookies",20)
  ]),["Donuts","Cookies","Breads"]);
});

test("client catalog removes missing products and accepts renamed Square categories", () => {
  const local=[{id:"bun",name:"Hot Dog Bun",price:"$1.00",category:"Breads",img:"/bun.png",url:""},{id:"gone",name:"Deleted Item",price:"$2.00",category:"Donuts",img:"/gone.png",url:""}];
  const merged=mergeSquareCatalog(local,[{name:"Hot Dog Bun",price:250,category:"Cookies"}]);
  assert.deepEqual(merged.map(({id,price,category})=>({id,price,category})),[{id:"bun",price:"$2.50",category:"Cookies"}]);
});

test("hidden Donut Lab item retains Square price without requiring a storefront category", () => {
  const local=[{id:"donut-lab-donut",name:"Donut lab donut",price:"$9.00",category:"Donuts",img:"/lab.png",url:""},{id:"regular",name:"Regular donut",price:"$2.00",category:"Donuts",img:"/regular.png",url:""}];
  const square=[{name:"Donut lab donut",price:275},{name:"Regular donut",price:200}];
  const hidden=new Set(["donut-lab-donut"]);
  assert.deepEqual(mergeSquareCatalog(local,square,hidden).map(({id,price,category})=>({id,price,category})),[{id:"donut-lab-donut",price:"$2.75",category:""}]);
  assert.deepEqual(mergeSquareCatalog(local,square.slice(1),hidden),[]);
});

test("client catalog prefers Square images and keeps repository images as fallback", () => {
  const local=[{id:"donut",name:"Donut",price:"$1.00",category:"Donuts",img:"/github.png",secondary:["/github-2.png"],url:""}];
  assert.equal(mergeSquareCatalog(local,[{name:"Donut",price:200,category:"Donuts",img:"https://square.example/donut.jpg"}])[0].img,"https://square.example/donut.jpg");
  assert.equal(mergeSquareCatalog(local,[{name:"Donut",price:200,category:"Donuts"}])[0].img,"/github.png");
});

test("storefront pricing asks Square for current product-rule discounts", async () => {
  const item=fixture();
  const objects=[item,
    {type:"PRODUCT_SET",id:"SET",product_set_data:{product_ids_any:["ITEM"]}},
    {type:"PRICING_RULE",id:"RULE",pricing_rule_data:{match_products_id:"SET",discount_id:"DISCOUNT"}},
    {type:"DISCOUNT",id:"DISCOUNT",discount_data:{discount_type:"FIXED_PERCENTAGE",percentage:"20"}}
  ];
  const calls=[];
  const products=await storefrontCatalogProductsWithDiscounts({request:async(path,options)=>{calls.push({path,options});return {order:{line_items:[{total_discount_money:{amount:60},total_money:{amount:240}}]}};}},objects,"STORE");
  assert.equal(calls.length,1);
  assert.equal(calls[0].path,"/v2/orders/calculate");
  assert.deepEqual(products.map(({name,price,originalPrice})=>({name,price,originalPrice})),[{name:"Banana Muffin",price:240,originalPrice:300}]);
});

test("storefront does not advertise discounts whose one-item Square calculation is ineligible", async () => {
  const item=fixture();
  const objects=[item,{type:"PRODUCT_SET",id:"SET",product_set_data:{all_products:true}},{type:"PRICING_RULE",id:"RULE",pricing_rule_data:{match_products_id:"SET",discount_id:"DISCOUNT"}}];
  const products=await storefrontCatalogProductsWithDiscounts({request:async()=>({order:{line_items:[{total_discount_money:{amount:0},total_money:{amount:300}}]}})},objects,"STORE");
  assert.equal(products[0].price,300);
  assert.equal(products[0].originalPrice,undefined);
});

test("client catalog formats Square sale and original prices", () => {
  const local=[{id:"muffin",name:"Muffin",price:"$3.00",category:"Muffins",img:"/muffin.png",url:""}];
  const [product]=mergeSquareCatalog(local,[{name:"Muffin",price:240,originalPrice:300,category:"Muffins"}]);
  assert.equal(product.price,"$2.40");
  assert.equal(product.originalPrice,"$3.00");
});

test("checkout rejects archived, deleted, absent and sold-out products before payment", async () => {
  for (const change of [item => item.is_deleted = true, item => item.item_data.is_archived = true, item => item.absent_at_location_ids = ["STORE"], item => item.item_data.variations[0].item_variation_data.location_overrides[0].sold_out = true]) {
    const item = fixture(); change(item);
    await assert.rejects(buildSquareOrder({ request: async () => ({ objects: [item] }) }, "STORE", { items: [{ name: item.item_data.name, quantity: 1 }], fulfillment }, null), { code: "CATALOG_ITEM_UNAVAILABLE" });
  }
});

test("different boxes and cake letters retain distinct cart identities", () => {
  const product = { id: "half-dozen-box" };
  const key = donuts => lineKeyOf({ product, customization: { kind: "box", donuts } });
  assert.equal(key(["a", "b"]), key(["b", "a"]));
  assert.notEqual(key(["a", "a"]), key(["a", "b"]));
  assert.notEqual(lineKeyOf({ product, customization: { kind: "glyph", glyph: "A" } }), lineKeyOf({ product, customization: { kind: "glyph", glyph: "B" } }));
});

test("Square order notes preserve each distinct cake letter", async () => {
  const item = fixture();
  const order = await buildSquareOrder({ request: async () => ({ objects: [item] }) }, "STORE", { items: ["A", "B"].map(() => ({ name: item.item_data.name, quantity: 1 })), customizations: ["A", "B"].map(glyph => ({ productName: item.item_data.name, kind: "glyph", glyph })), fulfillment }, null);
  assert.deepEqual(order.line_items.map(line => line.note), ["CUSTOM CAKE: A", "CUSTOM CAKE: B"]);
});

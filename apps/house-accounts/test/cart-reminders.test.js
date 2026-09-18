import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../apps/api/app.js";
import { reminderText, unsubscribeSignature, validUnsubscribeSignature } from "../apps/api/cart-reminders.js";

const cartId = "a3d50bce-d10c-4566-8a98-6201e4f5c928";
const cart = { tenant_id:"tenant-1", cart_id:cartId, email:"guest@example.com", items:[{name:"Chocolate Donut",quantity:2}] };

test("bag reminder signs its unsubscribe link and lists only the cart items",() => {
  const token=unsubscribeSignature("secret",cart.tenant_id,cart.cart_id,cart.email);
  assert.equal(validUnsubscribeSignature("secret",cart,token),true);
  assert.equal(validUnsubscribeSignature("secret",{...cart,email:"other@example.com"},token),false);
  const message=reminderText(cart,"https://example.test/",token);
  assert.match(message,/Chocolate Donut x 2/);
  assert.match(message,/Unsubscribe from this reminder/);
  assert.match(message,/https:\/\/example\.test\/shop\//);
});

test("returning customers receive automatic reminders; first-time carts do not",async t=>{
  const writes=[];
  let priorPurchase=false,unsubscribed=false;
  const pool={query:async(sql,values)=>{
    if(sql.includes("FROM sessions"))return {rows:[],rowCount:0};
    if(sql.includes("FROM tenants WHERE slug"))return {rows:[{id:cart.tenant_id}],rowCount:1};
    if(sql.includes("SELECT 1 FROM abandoned_carts WHERE tenant_id"))return {rows:unsubscribed?[{}]:[],rowCount:Number(unsubscribed)};
    if(sql.includes("SELECT so.id FROM storefront_orders"))return {rows:priorPurchase?[{id:"prior-order"}]:[],rowCount:Number(priorPurchase)};
    if(sql.includes("INSERT INTO abandoned_carts")||sql.includes("UPDATE abandoned_carts")){writes.push({sql,values});return {rows:[],rowCount:1};}
    if(sql.includes("FROM abandoned_carts WHERE cart_id"))return {rows:[cart],rowCount:1};
    throw new Error(`Unexpected query: ${sql}`);
  }};
  const app=createApp({pool,square:{searchCustomers:async()=>({customers:[]})},config:{sessionSecret:"secret",siteUrl:"https://example.test"}});
  const server=app.listen(0,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=body=>fetch(`${base}/api/public/storefront/cart-reminders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const firstTime=await post({cartId,email:cart.email,items:cart.items});
  assert.equal(firstTime.status,200);
  assert.equal((await firstTime.json()).eligible,false);
  assert.equal(writes.length,0);
  priorPurchase=true;
  const returning=await post({cartId,email:cart.email,items:cart.items});
  assert.equal(returning.status,200);
  assert.equal((await returning.json()).eligible,true);
  assert.match(writes[0].sql,/INSERT INTO abandoned_carts/);
  assert.equal(writes[0].values[5],"prior_purchase");
  const optedOut=await post({cartId,items:[]});
  assert.equal(optedOut.status,200);
  assert.match(writes[1].sql,/unsubscribed_at=now/);

  const token=unsubscribeSignature("secret",cart.tenant_id,cart.cart_id,cart.email);
  const url=`${base}/api/public/storefront/cart-reminders/unsubscribe?cartId=${cartId}&token=${token}`;
  const page=await fetch(url);
  assert.equal(page.status,200);
  assert.match(await page.text(),/method="POST"/);
  assert.equal(writes.length,2);
  const confirmed=await fetch(url,{method:"POST"});
  assert.equal(confirmed.status,200);
  assert.match(writes[2].sql,/unsubscribed_at=now/);
  unsubscribed=true;
  const afterUnsubscribe=await post({cartId,email:cart.email,items:cart.items});
  assert.equal((await afterUnsubscribe.json()).eligible,false);
  assert.equal(writes.length,3);
  assert.equal((await fetch(`${url}invalid`)).status,404);
});

test("preview checkout does not enroll carts in the production reminder job",async t=>{
  const previous=process.env.VERCEL_ENV;
  process.env.VERCEL_ENV="preview";
  t.after(()=>{if(previous===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previous;});
  const pool={query:async sql=>{
    if(sql.includes("FROM sessions"))return {rows:[],rowCount:0};
    if(sql.includes("FROM tenants WHERE slug"))return {rows:[{id:cart.tenant_id}],rowCount:1};
    throw new Error(`Preview must not query reminder records: ${sql}`);
  }};
  const app=createApp({pool,square:{},config:{sessionSecret:"secret"}});
  const server=app.listen(0,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/public/storefront/cart-reminders`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({cartId,email:cart.email,items:cart.items})
  });
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{ok:true,eligible:false});
});

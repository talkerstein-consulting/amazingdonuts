import test from "node:test";
import assert from "node:assert/strict";
import { buildSquareOrder, createApp } from "../apps/api/app.js";
import { deliveryConfig } from "../apps/api/delivery.js";

const recipient={displayName:"Test Customer",email:"test@example.com",phone:"4165550123"};
const monday=()=>{const date=new Date(Date.now()+14*86400000);while(date.getUTCDay()!==1)date.setUTCDate(date.getUTCDate()+1);date.setUTCHours(14,0,0,0);return date.toISOString();};
const item={type:"ITEM",id:"DONUT",item_data:{name:"Test Donut",variations:[{id:"DONUT-VAR",item_variation_data:{price_money:{amount:3000,currency:"CAD"},location_overrides:[]}}]}};
const fee={id:"SQUARE_DELIVERY_15",type:"SERVICE_CHARGE",service_charge_data:{name:"Delivery – $15",amount_money:{amount:1500,currency:"CAD"},taxable:true}};

test("scheduled fulfillments include prep time and ASAP fulfillments use ASAP routing",async()=>{
  const square={request:async()=>({objects:[item]})};
  for(const type of ["pickup","delivery"]){
    const base={items:[{name:"Test Donut",quantity:1}],fulfillment:{type,scheduledAt:monday(),recipient,...(type==="delivery"?{address:{addressLine1:"1 Test St",locality:"Toronto",postalCode:"M6A 2C5",country:"CA"}}:{})}};
    const scheduled=await buildSquareOrder(square,"LOCATION",base,null,{delivery:deliveryConfig({})});
    const detail=type==="pickup"?scheduled.fulfillments[0].pickup_details:scheduled.fulfillments[0].delivery_details;
    assert.equal(detail.schedule_type,"SCHEDULED");
    assert.equal(detail.prep_time_duration,"PT30M");
    const asap=await buildSquareOrder(square,"LOCATION",{...base,fulfillment:{...base.fulfillment,asap:true}},null,{delivery:deliveryConfig({})});
    assert.equal((type==="pickup"?asap.fulfillments[0].pickup_details:asap.fulfillments[0].delivery_details).schedule_type,"ASAP");
  }
});

test("delivery quote selects the matching Square charge and returns Square's taxed total",async t=>{
  const drafts=[];
  const square={request:async(path,options)=>{
    if(path==="/v2/catalog/list")return {objects:options.query.types==="SERVICE_CHARGE"?[fee]:[item]};
    assert.equal(path,"/v2/orders/calculate");
    const draft=options.body.order;drafts.push(draft);
    return {order:{...draft,subtotal_money:{amount:3000,currency:"CAD"},total_service_charge_money:{amount:draft.service_charges?1500:0,currency:"CAD"},total_tax_money:{amount:draft.service_charges?585:390,currency:"CAD"},total_money:{amount:draft.service_charges?5085:3390,currency:"CAD"},taxes:[{name:"HST",percentage:"13"}]}};
  }};
  const pool={query:async sql=>{assert.match(sql,/SELECT id FROM tenants/);return {rows:[{id:"TENANT"}],rowCount:1};}};
  const app=createApp({pool,square,config:{squareLocationId:"LOCATION",delivery:deliveryConfig({})}});
  const server=app.listen(0,"127.0.0.1");await new Promise(resolve=>server.once("listening",resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/public/storefront/quote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:[{name:"Test Donut",quantity:1}],customizations:[],fulfillment:{type:"delivery",scheduledAt:monday(),recipient,address:{addressLine1:"1 Test St",locality:"Toronto",administrativeDistrictLevel1:"ON",postalCode:"M6A 2C5",country:"CA"}}})});
  assert.equal(response.status,200,await response.clone().text());
  const quote=await response.json();
  assert.equal(drafts.length,2);
  assert.equal(drafts[1].service_charges[0].catalog_object_id,fee.id);
  assert.equal(quote.delivery.fee,1500);
  assert.equal(quote.order.tax,585);
  assert.equal(quote.order.total,5085);
});

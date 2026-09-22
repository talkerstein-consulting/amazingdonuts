import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../apps/api/app.js";

test("personal card saves and replaces separately from the institutional card",async t=>{
  let active=null,created=0;
  const disabled=[];
  const query=async(sql,values=[])=>{
    if(/^(BEGIN|COMMIT|ROLLBACK|SET LOCAL)/.test(sql))return {rows:[]};
    if(sql.includes("FROM sessions"))return {rows:[{id:"USER",tenant_id:"TENANT",email:"test@example.com",first_name:"Test",last_name:"Customer",role:"viewer"}],rowCount:1};
    if(sql.includes("FROM users u JOIN tenant_memberships"))return {rows:[{id:"USER",first_name:"Test",last_name:"Customer",email:"test@example.com",square_customer_id:"CUSTOMER"}],rowCount:1};
    if(sql.includes("INSERT INTO customer_profiles"))return {rows:[],rowCount:1};
    if(sql.includes("SELECT * FROM personal_cards"))return {rows:active?[active]:[],rowCount:active?1:0};
    if(sql.includes("UPDATE personal_cards SET status='disabled'")){assert.equal(values[0],active.id);active=null;return {rows:[],rowCount:1};}
    if(sql.includes("INSERT INTO personal_cards")){active={id:`ROW-${created}`,square_card_id:values[2],card_brand:values[3],last_4:values[4],exp_month:values[5],exp_year:values[6]};return {rows:[active],rowCount:1};}
    throw new Error(`Unexpected query: ${sql}`);
  };
  const pool={query,connect:async()=>({query,release(){}})};
  const square={environment:"production",retrieveCustomer:async()=>({customer:{id:"CUSTOMER"}}),createCard:async()=>{created++;return {card:{id:`CARD-${created}`,card_brand:"VISA",last_4:String(created).padStart(4,"0"),exp_month:12,exp_year:2030}}},disableCard:async id=>{disabled.push(id);}};
  const app=createApp({pool,square,config:{squareEnvironment:"production"}});
  const server=app.listen(0,"127.0.0.1");await new Promise(resolve=>server.once("listening",resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/api/storefront/personal-card`;
  const save=replace=>fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Cookie:"house_session=test"},body:JSON.stringify({sourceId:"cnon:card-nonce-ok",consent:true,cardholderName:"Test Customer",replace})});
  assert.equal((await save(false)).status,201);
  assert.equal((await save(false)).status,200);
  assert.equal(created,1);
  assert.equal((await save(true)).status,201);
  assert.equal(created,2);
  assert.deepEqual(disabled,["CARD-1"]);
  assert.equal(active.square_card_id,"CARD-2");
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveHouseCustomer, assertHouseCard, ensureHouseCustomer, ensureProfileCustomer, ensureHouseCardCustomer} from '../apps/api/house-customer.js';

const account={id:'account',tenant_id:'tenant',organization_name:'School',billing_email:'school@example.test',square_customer_id:'stale'};
const missing=()=>Object.assign(new Error('Missing'),{status:404,details:[{code:'NOT_FOUND'}]});
test('application repairs the personal profile without creating a house account',async()=>{
  const statements=[];
  const client={query:async(sql,args)=>{statements.push({sql,args});return {rows:sql.startsWith('SELECT')?[{id:'user',first_name:'Test',last_name:'Buyer',email:'test@example.test',square_customer_id:'old'}]:[]};},release(){}};
  let payload;
  const id=await ensureProfileCustomer({connect:async()=>client},{retrieveCustomer:async()=>{throw missing();},createCustomer:async body=>{payload=body;return {customer:{id:'repaired'}};}},'tenant','user');
  assert.equal(id,'repaired');
  assert.equal(payload.given_name,'Test');
  assert.equal(payload.email_address,'test@example.test');
  assert.equal(payload.reference_id,'profile-user');
  assert.ok(statements.some(s=>s.sql.includes('ON CONFLICT(tenant_id,user_id)')&&s.args[2]==='repaired'));
  assert.ok(!statements.some(s=>s.sql.includes('INSERT INTO accounts')));
});
test('valid customer is reused without creating a second customer',async()=>{
  const id=await resolveHouseCustomer({retrieveCustomer:async()=>({customer:{id:'existing'}}),createCustomer:()=>assert.fail('Unexpected creation')},account);
  assert.equal(id,'existing');
});
test('missing customer is automatically created with a stable environment-scoped key',async()=>{
  const calls=[];
  const square={baseUrl:'production',retrieveCustomer:async()=>{throw missing();},createCustomer:async body=>{calls.push(body);return {customer:{id:'new'}};}};
  assert.equal(await resolveHouseCustomer(square,account),'new');
  await resolveHouseCustomer(square,account);
  assert.equal(calls[0].idempotency_key,calls[1].idempotency_key);
  await resolveHouseCustomer({...square,baseUrl:'sandbox'},account);
  assert.notEqual(calls[0].idempotency_key,calls[2].idempotency_key);
  assert.equal(calls[0].reference_id,account.id);
});
test('authorization and network failures never create replacement customers',async()=>{
  for(const status of [401,403,429,502])await assert.rejects(resolveHouseCustomer({retrieveCustomer:async()=>{throw Object.assign(new Error('Unavailable'),{status});},createCustomer:()=>assert.fail('Unexpected creation')},account),/Unavailable/);
});
test('stale, disabled and wrong-customer cards block credit before payment',async()=>{
  for(const card of [undefined,{enabled:false,customer_id:'new'},{enabled:true,customer_id:'other'}])await assert.rejects(assertHouseCard({request:async()=>({card})},'card','new'),{code:'CARD_ON_FILE_REQUIRED'});
  await assert.rejects(assertHouseCard({request:async()=>{throw missing();}},'card','new'),{code:'CARD_ON_FILE_REQUIRED'});
  await assertHouseCard({request:async()=>({card:{enabled:true,customer_id:'new'}})},'card','new');
});
test('verified card owner repairs the environment-specific account customer link',async()=>{
  const updates=[];
  const pool={query:async(sql,args)=>{updates.push({sql,args});return {rowCount:1};}};
  const square={environment:'production',request:async()=>({card:{enabled:true,customer_id:'owner'}}),retrieveCustomer:async()=>({customer:{id:'owner',reference_id:'account'}})};
  assert.equal(await ensureHouseCardCustomer(pool,square,'tenant','account','card'),'owner');
  assert.deepEqual(updates[0].args,['account','tenant','production','owner']);
  assert.match(updates[0].sql,/square_customer_ids/);
});
test('unowned or unavailable cards cannot enable account credit',async()=>{
  const pool={query:()=>assert.fail('Unexpected account update')};
  await assert.rejects(ensureHouseCardCustomer(pool,{environment:'production',request:async()=>({card:{enabled:true,customer_id:'other'}}),retrieveCustomer:async()=>({customer:{id:'other',reference_id:'another-account'}})},'tenant','account','card'),{code:'CARD_ON_FILE_REQUIRED'});
  await assert.rejects(ensureHouseCardCustomer(pool,{environment:'production',request:async()=>({card:{enabled:false,customer_id:'owner'}})},'tenant','account','card'),{code:'CARD_ON_FILE_REQUIRED'});
  await assert.rejects(ensureHouseCardCustomer(pool,{environment:'production',request:async()=>{throw missing();}},'tenant','account','card'),{code:'CARD_ON_FILE_REQUIRED'});
});
test('repair locks and updates only the existing tenant account link',async()=>{
  const statements=[];
  const client={query:async(sql,args)=>{statements.push({sql,args});return {rows:sql.startsWith('SELECT')?[account]:[]};},release(){}};
  const id=await ensureHouseCustomer({connect:async()=>client},{retrieveCustomer:async()=>{throw missing();},createCustomer:async()=>({customer:{id:'new'}})},'tenant','account');
  assert.equal(id,'new');
  assert.ok(statements.some(s=>s.sql.includes('FOR UPDATE')));
  const updates=statements.filter(s=>s.sql.startsWith('UPDATE'));
  assert.equal(updates.length,1);
  assert.deepEqual(updates[0].args,['account','tenant','production','new']);
  assert.ok(updates[0].sql.includes('square_customer_ids'));
  assert.ok(!updates[0].sql.includes('credit_limit'));
});
test('institutional Square customers remain isolated by environment',async()=>{
  const sandbox={environment:'sandbox',retrieveCustomer:async id=>({customer:{id}}),createCustomer:()=>assert.fail('Unexpected creation')};
  const production={environment:'production',retrieveCustomer:async id=>({customer:{id}}),createCustomer:()=>assert.fail('Unexpected creation')};
  const scoped={...account,square_customer_ids:{sandbox:'sandbox-customer',production:'production-customer'}};
  assert.equal(await resolveHouseCustomer(sandbox,scoped),'sandbox-customer');
  assert.equal(await resolveHouseCustomer(production,scoped),'production-customer');
});

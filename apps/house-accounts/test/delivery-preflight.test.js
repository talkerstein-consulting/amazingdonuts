import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryPreflight } from '../apps/api/delivery-preflight.js';

test('Uber authentication failure blocks guest and account checkout before payment', async () => {
  for (const path of ['/api/storefront/checkout','/api/public/storefront/checkout','/api/storefront/quote','/api/public/storefront/quote']) {
    let error;
    await deliveryPreflight({uberDirectAutoDispatch:true},{accessToken:async()=>{throw new Error('invalid credentials');}})(
      {method:'POST',path,body:{fulfillment:{type:'delivery'}}}, {}, value=>{error=value;});
    assert.equal(error.code,'DELIVERY_AUTH_UNAVAILABLE');
    assert.equal(error.status,503);
  }
});
test('successful authentication continues, while pickup and manual delivery skip Uber', async () => {
  let calls=0;
  const uber={accessToken:async()=>{calls++;}};
  for(const [auto,type] of [[true,'delivery'],[true,'pickup'],[false,'delivery']]) {
    let continued=false;
    await deliveryPreflight({uberDirectAutoDispatch:auto},uber)({method:'POST',path:'/api/public/storefront/checkout',body:{fulfillment:{type}}},{},error=>{assert.equal(error,undefined);continued=true;});
    assert.equal(continued,true);
  }
  assert.equal(calls,1);
});

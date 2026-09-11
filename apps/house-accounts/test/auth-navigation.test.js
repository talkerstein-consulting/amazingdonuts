import test from 'node:test';
import assert from 'node:assert/strict';
import { authReturnTo, isCheckoutPath } from '../../../src/lib/auth-navigation.ts';

test('authentication returns checkout users to the checkout they were using', () => {
  const location = { pathname: '/checkout/', search: '?delivery=1', hash: '#payment' };
  assert.equal(isCheckoutPath(location.pathname), true);
  assert.equal(authReturnTo(location), '/checkout/?delivery=1#payment');
});

test('authentication sends every non-checkout page to the customer dashboard', () => {
  for (const pathname of ['/', '/shop/', '/donut-lab/', '/contact/', '/accounting/']) {
    assert.equal(authReturnTo({ pathname, search: '?from=test', hash: '#section' }), '/account/');
  }
});

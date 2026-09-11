import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('guest checkout uses public address autocomplete without requiring a session', () => {
  const checkout = readFileSync(new URL('../../../src/pages/CheckoutPage.tsx', import.meta.url), 'utf8');
  assert.match(checkout, /enabled=\{Boolean\(config\?\.placesEnabled\)\}/);
  const input = readFileSync(new URL('../../../src/components/AddressAutocomplete.tsx', import.meta.url), 'utf8');
  assert.match(input, /\/api\/house\/public\/storefront\$\{path\}/);
  assert.match(input, /addressApi\('\/address-search'/);
  assert.match(input, /if\(!enabled\|\|value\.trim\(\)\.length<3\)/);
  assert.match(input, /onChange\(\{\.\.\.address,addressLine1:value\}\)/);
});

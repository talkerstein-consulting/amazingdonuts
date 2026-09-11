import test from 'node:test';
import assert from 'node:assert/strict';
import { brandedEmailHtml, emailMessage } from '../apps/api/email.js';

const config = {
  emailFrom: 'Amazing Donuts <orders@example.com>',
  emailReplyTo: 'bakery@example.com',
  siteUrl: 'https://amazing-donuts.example'
};

test('all email messages include the Amazing Donuts branded HTML and text fallback', () => {
  const message = emailMessage(config, { to: 'customer@example.com', subject: 'Order confirmed', text: 'Thanks.\n\nView it: https://amazing-donuts.example/account/' });
  assert.equal(message.replyTo, 'bakery@example.com');
  assert.equal(message.text.includes('View it'), true);
  assert.match(message.html, /AMAZING DONUTS/);
  assert.match(message.html, /#FF6534/);
  assert.match(message.html, /href="https:\/\/amazing-donuts\.example\/account\/"/);
});

test('owner messages can reply directly to the related customer', () => {
  const message = emailMessage(config, { to: ['owner@example.com'], replyTo: 'customer@example.com', audience: 'owner', subject: 'New order', text: 'Customer details' });
  assert.equal(message.replyTo, 'customer@example.com');
  assert.match(message.html, /BAKERY NOTIFICATION/);
});

test('email HTML escapes customer-controlled content', () => {
  const html = brandedEmailHtml({ subject: '<Order>', text: '<script>alert(1)</script>', siteUrl: config.siteUrl });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

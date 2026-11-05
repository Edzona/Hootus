import assert from 'node:assert/strict';
import { test } from 'node:test';
import { messageEmail } from '../src/helpers/notificationEmail.js';

const link = 'http://localhost:5173/#/beta/listings';

test('message email names sender and listing, links to Hootus', () => {
  const email = messageEmail({ recipientName: 'Sam', senderName: 'Bea', listingTitle: 'IKEA desk', link });
  assert.equal(email.subject, 'Bea sent you a message about "IKEA desk"');
  assert.match(email.text, /^Hi Sam,/);
  assert.ok(email.text.includes(link));
  assert.ok(email.html.includes(`href="${link}"`));
});

test('message email escapes user-written names and titles', () => {
  const email = messageEmail({
    recipientName: '<b>Sam</b>', senderName: 'Bea <script>alert(1)</script>',
    listingTitle: 'Desk "& chair"', link,
  });
  assert.ok(!email.html.includes('<script>'));
  assert.ok(!email.html.includes('<b>Sam</b>'));
  assert.ok(email.html.includes('Desk &quot;&amp; chair&quot;'));
});

test('message email keeps the subject on one short line', () => {
  const email = messageEmail({
    recipientName: null, senderName: 'Bea\r\nBcc: someone@example.com', listingTitle: 'x'.repeat(200), link,
  });
  assert.ok(!/[\r\n]/.test(email.subject));
  assert.ok(email.subject.length < 170);
  assert.match(email.text, /^Hi,/);
});

test('message email falls back when names are missing', () => {
  const email = messageEmail({ recipientName: null, senderName: null, listingTitle: null, link });
  assert.equal(email.subject, 'A Hootus member sent you a message');
});

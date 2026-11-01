import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAllowedPushEndpoint, messagePush } from '../src/helpers/pushContent.js';

test('push endpoints are limited to browser push services', () => {
  for (const url of [
    'https://fcm.googleapis.com/fcm/send/abc:def',
    'https://updates.push.services.mozilla.com/wpush/v2/gAAAA',
    'https://wns2-par02p.notify.windows.com/w/?token=BQYAAA',
    'https://web.push.apple.com/QGuQyavXutnMH',
  ]) assert.ok(isAllowedPushEndpoint(url), url);
  for (const url of [
    'http://fcm.googleapis.com/fcm/send/abc', // not HTTPS
    'https://fcm.googleapis.com:8443/fcm/send/abc', // unexpected port
    'https://user:pass@fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com.evil.example/fcm/send/abc',
    'https://evilfcm.googleapis.com/x',
    'https://notify.windows.com.evil.example/w',
    'https://127.0.0.1/push',
    'https://169.254.169.254/latest/meta-data',
    'https://localhost/push',
    'not a url',
    `https://fcm.googleapis.com/${'a'.repeat(2100)}`,
  ]) assert.ok(!isAllowedPushEndpoint(url), url);
});

test('push payload names sender and listing but never message text', () => {
  const payload = JSON.parse(messagePush({
    senderName: 'Bea', listingTitle: 'IKEA desk', conversationId: 'c1', link: 'http://localhost:5173/#/beta/listings',
  }));
  assert.equal(payload.title, 'Bea sent you a message');
  assert.equal(payload.body, 'About "IKEA desk" on Hootus');
  assert.equal(payload.tag, 'conversation:c1');
  assert.equal(payload.url, 'http://localhost:5173/#/beta/listings');
});

test('push payload falls back when names are missing and stays small', () => {
  const payload = messagePush({
    senderName: null, listingTitle: 'x'.repeat(5000), conversationId: null, link: 'http://localhost:5173/',
  });
  assert.ok(payload.length < 1000); // push services cap payloads at about 4 KB
  assert.equal(JSON.parse(payload).title, 'A Hootus member sent you a message');
});

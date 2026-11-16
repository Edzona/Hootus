import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDigestEmail, signUnsubscribeToken, verifyUnsubscribeToken } from '../src/helpers/digest.js';

const secret = 'test-cron-secret-123456';
const profileId = '00000000-0000-4000-8000-000000000001';

test('unsubscribe tokens round-trip and reject tampering', () => {
  const token = signUnsubscribeToken(profileId, secret);
  assert.equal(verifyUnsubscribeToken(token, secret), profileId);
  assert.equal(verifyUnsubscribeToken(`${token}x`, secret), null);
  assert.equal(verifyUnsubscribeToken(token, 'other-secret-1234567890'), null);
  assert.equal(verifyUnsubscribeToken('not-a-uuid.abc', secret), null);
});

test('formatDigestEmail escapes HTML and includes Activity and unsubscribe links', () => {
  const email = formatDigestEmail({
    fullName: 'Sam <Admin>',
    total: 3,
    listings: [
      { id: '1', category: 'sales', title: 'Desk & <Chair>', price_jpy: 2500, location: 'TUJ Lobby' },
      { id: '2', category: 'housing', title: 'Room', price_jpy: null, location: null },
    ],
    clubPosts: [{ id: '3', club_name: 'Film Club', body: 'Screening tonight!' }],
    offers: [{ id: '4', title: '10% off coffee', business_name: 'Sangenjaya Cafe' }],
    activityUrl: 'http://localhost:5173/#/activity',
    unsubscribeUrl: 'http://localhost:5001/api/digest/unsubscribe?token=abc',
  });

  assert.equal(email.subject, '3 new updates on Hootus');
  assert.ok(email.text.includes('Film Club'));
  assert.ok(email.text.includes('10% off coffee'));
  assert.ok(email.text.includes('http://localhost:5173/#/activity'));
  assert.ok(email.text.includes('http://localhost:5001/api/digest/unsubscribe?token=abc'));
  assert.ok(email.html.includes('Desk &amp; &lt;Chair&gt;'));
  assert.ok(!email.html.includes('<Chair>'));
  assert.ok(!email.html.includes('<Admin>'));
});

import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import nodemailer from 'nodemailer';
import { sql } from '../../src/config/database.js';
import { env } from '../../src/config/env.js';
import {
  digestConfigured, formatDigestEmail, sendDailyDigests, signUnsubscribeToken, verifyUnsubscribeToken,
  type DigestEmailInput,
} from '../../src/helpers/digest.js';
import { uuid } from '../helpers/fakes.js';

const secret = 'test-cron-secret-123456';
const profileId = '00000000-0000-4000-8000-000000000001';
const baseInput: DigestEmailInput = {
  fullName: 'Ann',
  total: 1,
  listings: [{ id: '1', category: 'sales', title: 'Desk', price_jpy: 2500, location: null }],
  activityUrl: 'http://localhost:5173/#/activity',
  unsubscribeUrl: 'http://localhost:5001/api/digest/unsubscribe?token=abc',
};

afterEach(() => mock.restoreAll());

describe('signUnsubscribeToken', () => {
  it('A: (profileId, secret) -> "<profileId>.<base64url hmac>" and is deterministic', () => {
    const token = signUnsubscribeToken(profileId, secret);
    assert.match(token, new RegExp(`^${profileId}\\.[A-Za-z0-9_-]{43}$`));
    assert.equal(signUnsubscribeToken(profileId, secret), token);
  });

  it('B: different secrets or profiles give different tokens', () => {
    assert.notEqual(signUnsubscribeToken(profileId, secret), signUnsubscribeToken(profileId, 'another-secret-1234567'));
    assert.notEqual(signUnsubscribeToken(profileId, secret), signUnsubscribeToken(uuid(2), secret));
  });

  it('C: empty secret -> throws "CRON_SECRET is required to sign unsubscribe tokens."', () => {
    assert.throws(() => signUnsubscribeToken(profileId, ''), { message: 'CRON_SECRET is required to sign unsubscribe tokens.' });
  });

  it('D: default secret is env.CRON_SECRET', () => {
    assert.equal(signUnsubscribeToken(profileId), signUnsubscribeToken(profileId, env.CRON_SECRET));
  });
});

describe('verifyUnsubscribeToken', () => {
  it('A: valid token -> profileId', () => {
    assert.equal(verifyUnsubscribeToken(signUnsubscribeToken(profileId, secret), secret), profileId);
  });

  it('B: tampered mac, wrong secret, other profile id -> null', () => {
    const token = signUnsubscribeToken(profileId, secret);
    assert.equal(verifyUnsubscribeToken(`${token}x`, secret), null);
    assert.equal(verifyUnsubscribeToken(token, 'other-secret-1234567890'), null);
    const mac = token.split('.')[1];
    assert.equal(verifyUnsubscribeToken(`${uuid(2)}.${mac}`, secret), null);
  });

  it('C: empty secret -> null', () => {
    assert.equal(verifyUnsubscribeToken(signUnsubscribeToken(profileId, secret), ''), null);
  });

  for (const [label, token] of [
    ['no dot', 'abc'],
    ['three segments', `${profileId}.a.b`],
    ['empty mac', `${profileId}.`],
    ['empty id', '.abc'],
    ['non-UUID id', 'not-a-uuid.abc'],
    ['short mac of a valid id', `${profileId}.AAAA`],
    ['empty token', ''],
  ] as const) {
    it(`D: ${label} -> null`, () => {
      assert.equal(verifyUnsubscribeToken(token, secret), null);
    });
  }

  it('E: default secret is env.CRON_SECRET', () => {
    assert.equal(verifyUnsubscribeToken(signUnsubscribeToken(profileId)), profileId);
  });
});

describe('formatDigestEmail', () => {
  it('A: escapes HTML in names, titles and URLs, and links Activity and unsubscribe', () => {
    const email = formatDigestEmail({
      fullName: 'Sam <Admin>',
      total: 3,
      listings: [
        { id: '1', category: 'sales', title: 'Desk & <Chair>', price_jpy: 2500, location: 'TUJ Lobby' },
        { id: '2', category: 'housing', title: 'Room', price_jpy: null, location: null },
      ],
      clubPosts: [{ id: '3', club_name: 'Film Club', body: 'Screening tonight!' }],
      offers: [{ id: '4', title: '10% off coffee', business_name: 'Sangenjaya Cafe' }],
      activityUrl: 'http://localhost:5173/#/activity?a=1&b="2"',
      unsubscribeUrl: 'http://localhost:5001/api/digest/unsubscribe?token=abc',
    });
    assert.equal(email.subject, '3 new updates on Hootus');
    assert.ok(email.text.includes('Hi Sam <Admin>,'));
    assert.ok(email.text.includes('- [For sale] Desk & <Chair> (¥2,500 · TUJ Lobby)'));
    assert.ok(email.text.includes('- [Housing] Room (Ask for price)'));
    assert.ok(email.text.includes('- [Club] Film Club: Screening tonight!'));
    assert.ok(email.text.includes('- [Offer] 10% off coffee (Sangenjaya Cafe)'));
    assert.ok(email.text.includes('Open Activity for full details: http://localhost:5173/#/activity?a=1&b="2"'));
    assert.ok(email.text.includes('Unsubscribe from daily digest: http://localhost:5001/api/digest/unsubscribe?token=abc'));
    assert.ok(email.html.includes('Hi Sam &lt;Admin&gt;,'));
    assert.ok(email.html.includes('Desk &amp; &lt;Chair&gt;'));
    assert.ok(email.html.includes('href="http://localhost:5173/#/activity?a=1&amp;b=&quot;2&quot;"'));
    assert.ok(!email.html.includes('<Chair>'));
    assert.ok(!email.html.includes('<Admin>'));
  });

  it('B: total 1 -> singular subject; 0 and 2 -> plural', () => {
    assert.equal(formatDigestEmail({ ...baseInput, total: 1 }).subject, '1 new update on Hootus');
    assert.equal(formatDigestEmail({ ...baseInput, total: 0 }).subject, '0 new updates on Hootus');
    assert.equal(formatDigestEmail({ ...baseInput, total: 2 }).subject, '2 new updates on Hootus');
  });

  it('C: greeting uses the trimmed name, otherwise "Hi there,"', () => {
    assert.ok(formatDigestEmail({ ...baseInput, fullName: '  Ann  ' }).text.startsWith('Hi Ann,\n'));
    assert.ok(formatDigestEmail({ ...baseInput, fullName: null }).text.startsWith('Hi there,\n'));
    assert.ok(formatDigestEmail({ ...baseInput, fullName: '   ' }).text.startsWith('Hi there,\n'));
  });

  const priceCases: [string, number | null, string][] = [
    ['sales 1234567', 1234567, '¥1,234,567'],
    ['sales 99.6 rounds up', 99.6, '¥100'],
    ['sales 0', 0, '¥0'],
    ['sales null', null, 'Ask for price'],
  ];
  for (const [label, price, expected] of priceCases) {
    it(`D: price ${label} -> ${expected}`, () => {
      const email = formatDigestEmail({ ...baseInput, listings: [{ id: '1', category: 'sales', title: 'T', price_jpy: price, location: null }] });
      assert.ok(email.text.includes(`- [For sale] T (${expected})`), email.text);
    });
  }

  it('E: housing price gets "/mo" but a null housing price does not', () => {
    const priced = formatDigestEmail({ ...baseInput, listings: [{ id: '1', category: 'housing', title: 'R', price_jpy: 50000, location: null }] });
    assert.ok(priced.text.includes('- [Housing] R (¥50,000/mo)'));
    const unpriced = formatDigestEmail({ ...baseInput, listings: [{ id: '1', category: 'housing', title: 'R', price_jpy: null, location: null }] });
    assert.ok(unpriced.text.includes('- [Housing] R (Ask for price)'));
  });

  it('F: category labels: gigs -> Gig, unknown -> Listing', () => {
    const email = formatDigestEmail({
      ...baseInput,
      listings: [
        { id: '1', category: 'gigs', title: 'G', price_jpy: 100, location: null },
        { id: '2', category: 'cars', title: 'C', price_jpy: 100, location: null },
      ],
    });
    assert.ok(email.text.includes('- [Gig] G (¥100)'));
    assert.ok(email.text.includes('- [Listing] C (¥100)'));
    assert.ok(email.html.includes('<strong>[Gig]</strong> G'));
    assert.ok(email.html.includes('<strong>[Listing]</strong> C'));
  });

  it('G: total larger than the shown rows -> "...and N more in Activity." in text and html', () => {
    const email = formatDigestEmail({ ...baseInput, total: 10 });
    assert.ok(email.text.includes('...and 9 more in Activity.'));
    assert.ok(email.html.includes('…and 9 more in Activity.'));
  });

  it('H: total equal to the shown rows -> no "more" line', () => {
    const email = formatDigestEmail({ ...baseInput, total: 1 });
    assert.ok(!email.text.includes('more in Activity'));
    assert.ok(!email.html.includes('more in Activity'));
  });

  it('I: optional clubPosts/offers omitted, offer without business name has no parentheses', () => {
    const none = formatDigestEmail(baseInput);
    assert.ok(!none.text.includes('[Club]'));
    assert.ok(!none.text.includes('[Offer]'));
    const offer = formatDigestEmail({ ...baseInput, total: 2, offers: [{ id: '4', title: 'Free tea', business_name: null }] });
    assert.ok(offer.text.includes('- [Offer] Free tea\n'));
    assert.ok(offer.html.includes('<strong>[Offer]</strong> Free tea</li>'));
  });

  it('J: escapes all five special characters', () => {
    const email = formatDigestEmail({
      ...baseInput,
      listings: [{ id: '1', category: 'sales', title: `&<>"'`, price_jpy: 1, location: null }],
    });
    assert.ok(email.html.includes('&amp;&lt;&gt;&quot;&#39;'));
  });
});

describe('digestConfigured', () => {
  it('A: SMTP_HOST, SMTP_FROM and CRON_SECRET set -> true', () => {
    assert.equal(digestConfigured(), true);
  });

  for (const key of ['SMTP_HOST', 'SMTP_FROM', 'CRON_SECRET'] as const) {
    it(`B: ${key} missing -> false`, () => {
      const previous = env[key];
      (env as Record<string, unknown>)[key] = undefined;
      try {
        assert.equal(digestConfigured(), false);
      } finally {
        (env as Record<string, unknown>)[key] = previous;
      }
    });
  }
});

describe('sendDailyDigests', () => {
  it('A: SMTP not configured -> {enabled:false, sent:0, failed:0} and no database or mail work', async () => {
    const begin = mock.method(sql, 'begin', (async () => {
      throw new Error('Unexpected database call in unit test');
    }) as never);
    const create = mock.method(nodemailer, 'createTransport', (() => ({})) as never);
    const previous = env.SMTP_HOST;
    (env as Record<string, unknown>).SMTP_HOST = undefined;
    try {
      assert.deepEqual(await sendDailyDigests(), { enabled: false, sent: 0, failed: 0 });
    } finally {
      (env as Record<string, unknown>).SMTP_HOST = previous;
    }
    assert.equal(begin.mock.callCount(), 0);
    assert.equal(create.mock.callCount(), 0);
  });
});

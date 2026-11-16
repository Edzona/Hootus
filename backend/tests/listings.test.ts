import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { ListingCategory, UserRole } from '../src/types/domain.js';
import { listingSchema } from '../src/controllers/listings.controller.js';
import { env } from '../src/config/env.js';
import { createTestApi } from './helpers/api.js';
import { createIntegrationFixture, integrationOptions } from './helpers/fixtures.js';

const { call } = createTestApi();

test('listing validation covers supported categories and rejects unknown categories', () => {
  for (const category of Object.values(ListingCategory)) {
    assert.equal(listingSchema.parse({ category, title: 'Desk' }).category, category);
  }
  assert.equal(listingSchema.safeParse({ category: 'unknown', title: 'Desk' }).success, false);
});

test('listing API validation and persistence', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, owner } = fixture;
  try {
    await t.test('listing validation rejects spoofed ownership and negative prices', async () => {
      for (const body of [
        { category: ListingCategory.Sales, title: 'Desk', author_id: users[UserRole.Admin].id },
        { category: ListingCategory.Sales, title: 'Desk', price_jpy: -1 },
      ]) assert.equal((await call('/api/listings', users[UserRole.Student].token, body)).status, 400);
      assert.equal((await call('/api/listings?limit=101', users[UserRole.Student].token)).status, 400);
    });
    const bucket = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/listing-photos/`;
    const [photo, othersPhoto] = [randomUUID(), randomUUID()].map(id => `${id}.jpg`);
    await owner`insert into storage.objects (bucket_id, name, owner_id) values
      ('listing-photos', ${photo}, ${users[UserRole.Student].id}),
      ('listing-photos', ${othersPhoto}, ${users[UserRole.Admin].id})`;

    await t.test('listing photos must be the caller\'s own uploads', async () => {
      for (const url of ['https://example.com/desk.jpg', `${bucket}${othersPhoto}`, `${bucket}${randomUUID()}.jpg`,
        `${bucket}${users[UserRole.Student].id}/${photo}`]) {
        const result = await call('/api/listings', users[UserRole.Student].token, {
          category: ListingCategory.Sales, title: 'Desk', image_urls: [url],
        });
        assert.equal(result.status, 400, url);
      }
    });

    await t.test('student creates and reads a persisted listing', async () => {
      const result = await call('/api/listings', users[UserRole.Student].token, {
        category: ListingCategory.Sales, title: 'Integration test desk', price_jpy: 1500,
        image_urls: [`${bucket}${photo}`],
      });
      assert.equal(result.status, 201, JSON.stringify(result.body));
      assert.deepEqual(result.body.data.author, { name: 'Test student' });
      assert(!('author_id' in result.body.data));
      const [stored] = await owner`select price_jpy from public.listings where public_id = ${result.body.data.id}`;
      assert.equal(Number(stored.price_jpy), 1500);
      assert.equal(result.body.data.price_jpy, 1500);
      assert.deepEqual(result.body.data.image_urls, [`${bucket}${photo}`]);
      const otherReader = await call('/api/listings?limit=100', users[UserRole.ClubLeader].token);
      assert.equal(otherReader.status, 200);
      const listing = otherReader.body.data.find((row: { id: string }) => row.id === result.body.data.id);
      assert.deepEqual(listing.author, { name: 'Test student' });
      assert(!('author_id' in listing));
      assert(!JSON.stringify(listing).includes(users[UserRole.Student].publicId));
      assert(!JSON.stringify(listing).includes(users[UserRole.Student].id));
      assert.match(listing.id, /^[0-9a-f-]{36}$/);
      assert(!('public_id' in listing));
    });
  } finally {
    try {
      await owner.begin(async tx => {
        await tx`select set_config('storage.allow_delete_query', 'true', true)`;
        await tx`delete from storage.objects where bucket_id = 'listing-photos'
          and owner_id = any(${[users[UserRole.Student].id, users[UserRole.Admin].id]})`;
      });
    } finally {
      await fixture.cleanup();
    }
  }
});

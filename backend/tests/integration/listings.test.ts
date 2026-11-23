import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { ListingCategory, UserRole } from '../../src/types/domain.js';
import { env } from '../../src/config/env.js';
import { createTestApi } from '../helpers/api.js';
import { createIntegrationFixture, integrationOptions } from '../helpers/fixtures.js';

const { call } = createTestApi();

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
    await t.test('category filter runs before pagination and partners cannot read hidden contacts', async () => {
      const student = users[UserRole.Student];
      const housing = await call('/api/listings', student.token, {
        category: ListingCategory.Housing, title: 'Integration test room', price_jpy: 50000,
      });
      assert.equal(housing.status, 201, JSON.stringify(housing.body));
      const gig = await call('/api/listings', users[UserRole.ClubLeader].token, {
        category: ListingCategory.Gigs, title: 'Integration test gig', price_jpy: 1000,
      });
      assert.equal(gig.status, 201, JSON.stringify(gig.body));
      const filtered = await call('/api/listings?limit=1&category=housing', student.token);
      assert.equal(filtered.status, 200);
      assert.deepEqual(filtered.body.data.map((row: { id: string }) => row.id), [housing.body.data.id]);
      const market = await call('/api/listings?limit=100&category=sales,gigs', student.token);
      assert(market.body.data.every((row: { category: string }) => row.category !== ListingCategory.Housing));
      assert(market.body.data.some((row: { id: string }) => row.id === gig.body.data.id));
      for (const category of ['bogus', '', 'sales,']) {
        assert.equal((await call(`/api/listings?category=${category}`, student.token)).status, 400);
      }

      const contactPath = `/api/listings/${housing.body.data.id}/contact`;
      const contact = await call(contactPath, users[UserRole.ClubLeader].token);
      assert.equal(contact.status, 200);
      assert.equal(contact.body.data.email, student.email);
      const partnerContact = await call(contactPath, users[UserRole.Partner].token);
      assert.equal(partnerContact.status, 404);
      assert(!JSON.stringify(partnerContact.body).includes(student.email));
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

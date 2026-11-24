import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { ListingCategory, ListingStatus, UserRole } from '../../src/types/domain.js';
import { env } from '../../src/config/env.js';
import { createTestApi } from '../helpers/api.js';
import { createIntegrationFixture, integrationOptions } from '../helpers/fixtures.js';

const { call } = createTestApi();

test('listing API validation and persistence', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, owner } = fixture;
  try {
    await t.test('listing validation middleware rejects spoofed ownership', async () => {
      assert.equal((await call('/api/listings', users[UserRole.Student].token, {
        category: ListingCategory.Sales, title: 'Desk', author_id: users[UserRole.Admin].id,
      })).status, 400);
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
      assert.equal((await call('/api/listings?category=bogus', student.token)).status, 400);

      const contactPath = `/api/listings/${housing.body.data.id}/contact`;
      const contact = await call(contactPath, users[UserRole.ClubLeader].token);
      assert.equal(contact.status, 200);
      assert.equal(contact.body.data.email, student.email);
      const partnerContact = await call(contactPath, users[UserRole.Partner].token);
      assert.equal(partnerContact.status, 404);
      assert(!JSON.stringify(partnerContact.body).includes(student.email));
    });
    await t.test('owner edits open listings, transitions status to sold/closed, and views sold history', async () => {
      const student = users[UserRole.Student];
      const other = users[UserRole.ClubLeader];
      const activeItem = (await call('/api/listings', student.token, {
        category: ListingCategory.Sales, title: 'Lifecycle active item', price_jpy: 900,
      })).body.data;
      const soldItem = (await call('/api/listings', student.token, {
        category: ListingCategory.Sales, title: 'Lifecycle sold item', price_jpy: 1200,
      })).body.data;
      const closedItem = (await call('/api/listings', student.token, {
        category: ListingCategory.Gigs, title: 'Lifecycle closed item', price_jpy: 2000,
      })).body.data;

      // Non-owners cannot edit or transition another member's listing.
      assert.equal((await call(`/api/listings/${soldItem.id}`, other.token, {
        category: ListingCategory.Sales, title: 'Hijacked', price_jpy: 1,
      }, {}, 'PATCH')).status, 404);
      const [unchanged] = await owner`select title from public.listings where public_id = ${soldItem.id}`;
      assert.equal(unchanged.title, 'Lifecycle sold item');

      const edited = await call(`/api/listings/${soldItem.id}`, student.token, {
        category: ListingCategory.Sales, title: 'Edited sold item', price_jpy: 1800,
      }, {}, 'PATCH');
      assert.equal(edited.status, 200, JSON.stringify(edited.body));
      assert.equal(edited.body.data.title, 'Edited sold item');
      assert.equal(edited.body.data.price_jpy, 1800);
      assert.deepEqual(edited.body.data.author, { name: 'Test student' });
      assert.equal(edited.body.data.is_mine, true);
      const [persisted] = await owner`select title, price_jpy from public.listings where public_id = ${soldItem.id}`;
      assert.equal(persisted.title, 'Edited sold item');
      assert.equal(Number(persisted.price_jpy), 1800);

      assert.equal((await call(`/api/listings/${soldItem.id}/status`, other.token, { status: ListingStatus.Sold }, {}, 'PATCH')).status, 404);
      const markedSold = await call(`/api/listings/${soldItem.id}/status`, student.token, { status: ListingStatus.Sold }, {}, 'PATCH');
      assert.equal(markedSold.status, 200, JSON.stringify(markedSold.body));
      assert.deepEqual(markedSold.body.data, { id: soldItem.id, status: ListingStatus.Sold });
      const markedClosed = await call(`/api/listings/${closedItem.id}/status`, student.token, { status: ListingStatus.Closed }, {}, 'PATCH');
      assert.equal(markedClosed.status, 200, JSON.stringify(markedClosed.body));
      assert.deepEqual(markedClosed.body.data, { id: closedItem.id, status: ListingStatus.Closed });

      const activeList = (await call('/api/listings?limit=100', other.token)).body.data as { id: string }[];
      assert(!activeList.some(row => row.id === soldItem.id || row.id === closedItem.id));
      assert.equal((await call(`/api/listings/${soldItem.id}`, student.token, {
        category: ListingCategory.Sales, title: 'Edit after sold',
      }, {}, 'PATCH')).status, 404);
      assert.equal((await call(`/api/listings/${soldItem.id}/contact`, other.token)).status, 404);
      assert.equal((await call(`/api/listings/${closedItem.id}/contact`, other.token)).status, 404);

      const mySold = await call('/api/listings/mine/sold?limit=100', student.token);
      assert.equal(mySold.status, 200, JSON.stringify(mySold.body));
      const soldRows = mySold.body.data as { id: string; ended_at: string | null }[];
      const foundSold = soldRows.find(row => row.id === soldItem.id);
      assert(foundSold);
      assert(foundSold.ended_at);
      assert(!soldRows.some(row => row.id === closedItem.id || row.id === activeItem.id));

      const othersSold = await call('/api/listings/mine/sold?limit=100', other.token);
      assert.equal(othersSold.status, 200);
      assert(!(othersSold.body.data as { id: string }[]).some(row => row.id === soldItem.id));
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

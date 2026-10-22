import { createTestApi } from './helpers/api.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { profileUpdateSchema } from '../src/controllers/profile.controller.js';
import { test } from 'node:test';
import { UserRole } from '../src/types/domain.js';
import { authOptions, createIntegrationFixture, integrationOptions } from './helpers/fixtures.js';

const { call } = createTestApi();

test('profile updates accept only bio and photo changes', () => {
  assert.equal(profileUpdateSchema.parse({ bio: '  Hello  ' }).bio, 'Hello');
  assert.equal(profileUpdateSchema.parse({ bio: '   ' }).bio, null);
  assert.equal(profileUpdateSchema.parse({ avatar_url: null }).avatar_url, null);
  assert.equal(profileUpdateSchema.safeParse({ bio: 'x'.repeat(501) }).success, false);
  assert.equal(profileUpdateSchema.safeParse({}).success, false);
  for (const field of ['full_name', 'student_id', 'role', 'email']) {
    assert.equal(profileUpdateSchema.safeParse({ bio: 'Hi', [field]: 'x' }).success, false);
  }
});

test('profile privacy and uniqueness', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, owner, url } = fixture;
  try {
    await t.test('students receive only their own public profile identity', async () => {
      const result = await call('/api/profile/me', users[UserRole.Student].token);
      assert.equal(result.status, 200);
      assert.equal(result.body.data.id, users[UserRole.Student].publicId);
      assert.equal(result.body.data.role, UserRole.Student);
      assert.notEqual(result.body.data.id, users[UserRole.Student].id);
      assert(!('auth_user_id' in result.body.data));
      assert(!('internal_id' in result.body.data));
    });
    await t.test('students update their own bio and uploaded photo only', async () => {
      const student = users[UserRole.Student];
      const other = users[UserRole.Admin];
      const storage = (token: string) => createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY!, {
        auth: authOptions, global: { headers: { Authorization: `Bearer ${token}` } },
      }).storage.from('avatars');
      const png = new Blob([Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64')], { type: 'image/png' });
      const path = `${student.id}/${randomUUID()}.png`;
      const uploaded = await storage(student.token).upload(path, png, { contentType: 'image/png' });
      assert.ifError(uploaded.error);
      try {
        // Storage rules: only your own folder, only images.
        const intruder = await storage(other.token).upload(`${student.id}/${randomUUID()}.png`, png, { contentType: 'image/png' });
        assert(intruder.error, 'Uploading into another student folder must fail');
        const text = await storage(student.token).upload(`${student.id}/${randomUUID()}.png`,
          new Blob(['not an image'], { type: 'text/plain' }), { contentType: 'text/plain' });
        assert(text.error, 'Non-image uploads must fail');
        const removedByOther = await storage(other.token).remove([path]);
        assert.equal(removedByOther.data?.length ?? 0, 0, 'Another student cannot delete my photo');

        const photo = storage(student.token).getPublicUrl(path).data.publicUrl;
        const saved = await call('/api/profile/me', student.token, { bio: '  Second-year CS student  ', avatar_url: photo }, {}, 'PATCH');
        assert.equal(saved.status, 200, JSON.stringify(saved.body));
        assert.equal(saved.body.data.bio, 'Second-year CS student');
        assert.equal(saved.body.data.avatar_url, photo);
        assert.equal((await fetch(photo)).status, 200, 'Saved photo URL is publicly viewable');
        const bioOnly = await call('/api/profile/me', student.token, { bio: 'Updated bio' }, {}, 'PATCH');
        assert.equal(bioOnly.body.data.avatar_url, photo, 'Omitted fields stay unchanged');

        // Photos must come from the caller's own folder in our bucket.
        const otherFolder = photo.replace(student.id, other.id);
        for (const avatar_url of ['https://example.com/me.png', otherFolder, photo.replace('.png', '.gif')]) {
          const rejected = await call('/api/profile/me', student.token, { avatar_url }, {}, 'PATCH');
          assert.equal(rejected.status, 400, avatar_url);
        }
        for (const body of [{ bio: 'x'.repeat(501) }, { full_name: 'New name' }, { student_id: '123456789' }, { role: UserRole.Admin }]) {
          assert.equal((await call('/api/profile/me', student.token, body, {}, 'PATCH')).status, 400);
        }
        const [stored] = await owner`select full_name, role, bio, avatar_url from public.profiles where auth_user_id = ${student.id}`;
        assert.deepEqual(stored, { full_name: 'Test student', role: UserRole.Student, bio: 'Updated bio', avatar_url: photo });
        const [untouched] = await owner`select bio, avatar_url from public.profiles where auth_user_id = ${other.id}`;
        assert.deepEqual(untouched, { bio: null, avatar_url: null });

        const cleared = await call('/api/profile/me', student.token, { bio: '', avatar_url: null }, {}, 'PATCH');
        assert.equal(cleared.status, 200);
        assert.equal(cleared.body.data.bio, null);
        assert.equal(cleared.body.data.avatar_url, null);
      } finally {
        await storage(student.token).remove([path]);
      }
    });
    await t.test('database rejects duplicate profile emails even through privileged writes', async () => {
      await assert.rejects(owner`
        update public.profiles set email = ${users[UserRole.Student].email.toUpperCase()}
        where auth_user_id = ${users[UserRole.Admin].id}
      `, { code: '23505' });
      const [original] = await owner`select email from public.profiles where auth_user_id = ${users[UserRole.Admin].id}`;
      assert.equal(original.email, users[UserRole.Admin].email);
    });
  } finally {
    await fixture.cleanup();
  }
});

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDashboardRedirect, hasSignInCallback } from '../src/lib/authRedirect.js'

const session = { user: { id: 'student' } }

function router(hash = '', callbackPending = false) {
  const destinations = []
  const handle = createDashboardRedirect({
    callbackPending,
    getHash: () => hash,
    navigate: (destination) => { hash = destination; destinations.push(destination) },
  })
  return { handle, destinations }
}

test('email-link sign-in redirects even after Auth clears the callback hash', () => {
  const callbackPending = hasSignInCallback('http://localhost/#access_token=fixture&type=magiclink')
  const { handle, destinations } = router('', callbackPending)
  handle('INITIAL_SESSION', session)
  handle('SIGNED_IN', session)
  assert.deepEqual(destinations, ['#/dashboard'])
})

test('code callbacks are recognized before Auth consumes the URL', () => {
  assert.equal(hasSignInCallback('http://localhost/?code=fixture'), true)
  assert.equal(hasSignInCallback('http://localhost/#/clubs'), false)
})

test('restored sessions on sign-in pages go to the dashboard', () => {
  const { handle, destinations } = router('#/signup')
  handle('INITIAL_SESSION', session)
  assert.deepEqual(destinations, ['#/dashboard'])
})

test('a new sign-in after an anonymous session goes to the dashboard', () => {
  const { handle, destinations } = router('#top')
  handle('INITIAL_SESSION', null)
  handle('SIGNED_IN', session)
  assert.deepEqual(destinations, ['#/dashboard'])
})

test('restoring or refreshing a session preserves club and profile deep links', () => {
  for (const hash of ['#/clubs/film', '#/profile']) {
    const { handle, destinations } = router(hash)
    handle('INITIAL_SESSION', session)
    handle('SIGNED_IN', session)
    handle('TOKEN_REFRESHED', session)
    assert.deepEqual(destinations, [])
  }
})

test('failed sign-ins and sign-outs do not redirect', () => {
  const { handle, destinations } = router('#/signup', true)
  handle('INITIAL_SESSION', null)
  handle('SIGNED_OUT', null)
  assert.deepEqual(destinations, [])
})

test('switching accounts redirects to a fresh dashboard', () => {
  const { handle, destinations } = router('#/saved')
  handle('INITIAL_SESSION', session)
  handle('SIGNED_IN', { user: { id: 'another-student' } })
  assert.deepEqual(destinations, ['#/dashboard'])
})

test('password-recovery callbacks are not treated as sign-in callbacks', () => {
  assert.equal(hasSignInCallback('http://localhost/#access_token=fixture&type=recovery'), false)
})

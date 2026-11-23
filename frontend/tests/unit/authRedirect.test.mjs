import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDashboardRedirect } from '../../src/lib/authRedirect.js'

const session = { user: { id: 'student' } }

function router(hash = '') {
  const destinations = []
  const handle = createDashboardRedirect({
    getHash: () => hash,
    navigate: (destination) => { hash = destination; destinations.push(destination) },
  })
  return { handle, destinations }
}

describe('authRedirect', () => {
  describe('createDashboardRedirect', () => {
    it('redirects restored sessions on sign-in pages to the dashboard', () => {
      const { handle, destinations } = router('#/signup')
      handle('INITIAL_SESSION', session)
      assert.deepEqual(destinations, ['#/dashboard'])
    })

    it('redirects a new sign-in after an anonymous session to the dashboard', () => {
      const { handle, destinations } = router('#top')
      handle('INITIAL_SESSION', null)
      handle('SIGNED_IN', session)
      assert.deepEqual(destinations, ['#/dashboard'])
    })

    it('preserves club and profile deep links when restoring or refreshing a session', () => {
      for (const hash of ['#/clubs/film', '#/profile']) {
        const { handle, destinations } = router(hash)
        handle('INITIAL_SESSION', session)
        handle('SIGNED_IN', session)
        handle('TOKEN_REFRESHED', session)
        assert.deepEqual(destinations, [])
      }
    })

    it('does not redirect on failed sign-ins or sign-outs', () => {
      const { handle, destinations } = router('#/signup')
      handle('INITIAL_SESSION', null)
      handle('SIGNED_OUT', null)
      assert.deepEqual(destinations, [])
    })

    it('redirects to a fresh dashboard when switching accounts', () => {
      const { handle, destinations } = router('#/saved')
      handle('INITIAL_SESSION', session)
      handle('SIGNED_IN', { user: { id: 'another-student' } })
      assert.deepEqual(destinations, ['#/dashboard'])
    })
  })
})

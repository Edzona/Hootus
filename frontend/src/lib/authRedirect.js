export function hasSignInCallback(href) {
  const url = new URL(href)
  const params = new URLSearchParams(url.hash.slice(1))
  return params.get('type') !== 'recovery' &&
    (params.has('access_token') || url.searchParams.has('code'))
}

export function createDashboardRedirect({ callbackPending, getHash, navigate }) {
  let previousUserId

  return (event, session) => {
    const userId = session?.user.id ?? null
    const newSignIn = event === 'SIGNED_IN' && previousUserId !== undefined && previousUserId !== userId
    previousUserId = userId
    if (!session || (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN')) return

    const onSignInPage = /^#\/signup(?:[/?]|$)/.test(getHash())
    if (callbackPending || onSignInPage || newSignIn) {
      callbackPending = false
      navigate('#/dashboard')
    }
  }
}

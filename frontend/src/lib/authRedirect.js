export function createDashboardRedirect({ getHash, navigate }) {
  let previousUserId

  return (event, session) => {
    const userId = session?.user.id ?? null
    const newSignIn = event === 'SIGNED_IN' && previousUserId !== undefined && previousUserId !== userId
    previousUserId = userId
    if (!session || (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN')) return

    const onSignInPage = /^#\/signup(?:[/?]|$)/.test(getHash())
    if (onSignInPage || newSignIn) {
      navigate('#/dashboard')
    }
  }
}

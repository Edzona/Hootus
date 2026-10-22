import { useEffect, useId, useState } from 'react'
import { getSupabase } from '../lib/supabase'

export default function CodeVerification({ email, signingIn, resend, onChangeEmail }) {
  const id = useId()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [remaining, setRemaining] = useState(60)
  const busy = status !== 'idle'

  useEffect(() => {
    if (!remaining) return
    const timer = setTimeout(() => setRemaining(remaining - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  async function verify(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the six-digit code from your email.')
      return
    }
    setStatus('verifying')
    try {
      const { data, error: authError } = await getSupabase().auth.verifyOtp({ email, token: code.trim(), type: 'email' })
      if (authError || !data.session) {
        if (authError?.status === 429) setError('Too many attempts. Please wait a minute before trying again.')
        else if (authError?.status >= 500 || authError?.name === 'AuthRetryableFetchError') {
          setError('Sign-in is temporarily unavailable. Check your connection and try again.')
        } else setError('That code is invalid or expired. Check your latest email or request another code.')
        setStatus('idle')
        return
      }
      window.location.hash = '/dashboard'
    } catch {
      setError('Sign-in could not be completed. Check your connection and try again.')
      setStatus('idle')
    }
  }

  async function resendCode() {
    setStatus('resending')
    setError('')
    setMessage('')
    try {
      await resend()
      setRemaining(60)
      setCode('')
      setMessage('Code requested. Use the code in your latest email.')
    } catch (err) {
      setError(err.message)
    } finally {
      setStatus('idle')
    }
  }

  return (
    <form onSubmit={verify} noValidate className="mt-10 border-2 border-ink bg-white p-6 shadow-hard sm:p-8">
      <h2 className="font-display text-2xl font-bold">Check your Temple email</h2>
      <p id={`${id}-help`} className="mt-3 break-words text-ink/75">
        {signingIn ? 'If you have an account, we sent a code to ' : 'We sent a code to '}
        <strong>{email}</strong>. Enter it here to continue in this tab.
      </p>
      <label htmlFor={id} className="mt-6 block font-medium">Sign-in code</label>
      <input id={id} value={code} onChange={event => { setCode(event.target.value); setError('') }}
        type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
        disabled={busy} aria-invalid={!!error} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
        className="mt-2 w-full border-2 border-ink px-4 py-3.5 font-mono text-2xl tracking-[0.3em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" />
      {error && <p id={`${id}-error`} role="alert" className="mt-3 text-sm text-cherry">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm text-ink/75">{message}</p>}
      <button type="submit" disabled={busy} className="btn-primary mt-6 w-full disabled:opacity-50">
        {status === 'verifying' ? 'Verifying…' : 'Verify and sign in'}
      </button>
      <div className="mt-5 flex flex-wrap gap-5 text-sm">
        <button type="button" onClick={resendCode} disabled={busy || remaining > 0} className="underline disabled:opacity-50">
          {status === 'resending' ? 'Sending…' : remaining ? `Resend code in ${remaining}s` : 'Resend code'}
        </button>
        <button type="button" onClick={onChangeEmail} disabled={busy} className="underline disabled:opacity-50">Change email</button>
      </div>
    </form>
  )
}

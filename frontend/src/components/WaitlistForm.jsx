import { useId, useState } from 'react'

const DOMAIN = '@tuj.temple.edu'
const TUJ_EMAIL = /^[a-z0-9._%+-]+@tuj\.temple\.edu$/

export default function WaitlistForm({ tone = 'light' }) {
  const id = useId()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const dark = tone === 'dark'

  function handleSubmit(e) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!TUJ_EMAIL.test(value)) {
      setStatus('error')
      return
    }
    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        className={`flex max-w-xl items-center gap-3 border-2 border-ink px-4 py-3.5 font-mono text-sm ${
          dark ? 'bg-paper text-ink' : 'bg-sun'
        }`}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-paper">✓</span>
        <span>
          You&apos;re on the list. We&apos;ll ping <strong>{email.trim()}</strong> when HUS opens.
        </span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-xl">
      <label htmlFor={id} className="sr-only">
        TUJ email address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={id}
          type="email"
          autoComplete="email"
          placeholder={`you${DOMAIN}`}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? `${id}-error` : undefined}
          className="min-w-0 flex-1 border-2 border-ink bg-white px-4 py-3.5 font-mono text-sm text-ink outline-none transition-shadow placeholder:text-ink/40 focus:shadow-hard"
        />
        <button type="submit" className={dark ? 'btn-ink' : 'btn-primary'}>
          Get early access →
        </button>
      </div>
      {status === 'error' && (
        <p id={`${id}-error`} className={`mt-2 font-mono text-xs ${dark ? 'text-paper' : 'text-cherry'}`}>
          Use your {DOMAIN} email — HUS is for verified TUJ students only.
        </p>
      )}
    </form>
  )
}

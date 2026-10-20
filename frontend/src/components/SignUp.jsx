import { useId, useState } from 'react'
import { Wordmark } from './Logo'
import { apiRequest } from '../lib/api'

const DOMAIN = '@temple.edu'
const TEMPLE_EMAIL = /^[a-z0-9._%+-]+@temple\.edu$/
const STUDENT_ID = /^\d{9}$/

const inputClass =
  'w-full border-2 border-ink bg-white px-4 py-3.5 font-mono text-sm text-ink outline-none transition-shadow placeholder:text-ink/40 focus:shadow-hard'

const labelClass = 'eyebrow text-ink/70'

const fields = [
  { key: 'name', label: 'Full name', type: 'text', autoComplete: 'name', placeholder: 'Hana Tanaka' },
  { key: 'studentId', label: 'Student ID', type: 'text', inputMode: 'numeric', placeholder: '9-digit ID' },
  { key: 'email', label: 'Student email', type: 'email', autoComplete: 'email', placeholder: `you${DOMAIN}` },
]

export default function SignUp() {
  const id = useId()
  const [values, setValues] = useState({ name: '', studentId: '', email: '' })
  const [status, setStatus] = useState('idle')
  const [errors, setErrors] = useState({})
  const [signingIn, setSigningIn] = useState(false)

  function validate(v) {
    const errs = {}
    if (!signingIn && !v.name.trim()) errs.name = 'Enter your full name.'
    if (!signingIn && !STUDENT_ID.test(v.studentId.trim())) errs.studentId = 'Enter your 9-digit student ID.'
    if (!TEMPLE_EMAIL.test(v.email.trim().toLowerCase()))
      errs.email = `Use your ${DOMAIN} email — HUS is for verified Temple students only.`
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    if (Object.keys(errs).length) {
      setStatus('error')
      return
    }
    setStatus('sending')
    try {
      await apiRequest(signingIn ? '/auth/signin' : '/auth/signup', {
        method: 'POST',
        authenticated: false,
        body: {
          email: values.email.trim().toLowerCase(),
          redirectTo: window.location.origin,
          ...(!signingIn ? { name: values.name.trim(), studentId: values.studentId.trim() } : {}),
        },
      })
      setStatus('success')
    } catch (error) {
      setErrors({ form: error.message || 'Unable to send your sign-in link. Please try again.' })
      setStatus('error')
    }
  }

  function setField(key) {
    return (e) => {
      setValues((v) => ({ ...v, [key]: e.target.value }))
      if (errors[key]) setErrors((errs) => ({ ...errs, [key]: undefined }))
    }
  }

  return (
    <div className="grain relative min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
          <a href="#top" aria-label="HUS home">
            <Wordmark />
          </a>
          <a href="#top" className="link-underline pb-1 font-mono text-xs uppercase tracking-widest">
            ← Back to home
          </a>
        </nav>
      </header>

      <main className="relative mx-auto flex max-w-7xl justify-center px-5 py-16 md:px-8 lg:py-24">
        <div className="w-full max-w-lg">
          <p className="rise eyebrow text-cherry">{signingIn ? 'Welcome back' : 'Create account'}</p>
          <h1
            className="rise mt-4 font-display text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.035em]"
            style={{ '--d': '100ms' }}
          >
            Join the{' '}
            <span className="font-serif font-normal italic tracking-normal text-cherry">flock.</span>
          </h1>
          <p className="rise mt-6 text-lg leading-relaxed text-ink/75" style={{ '--d': '200ms' }}>
            Verified Temple students only. Your student ID and{' '}
            <span className="whitespace-nowrap font-mono text-base text-ink">{DOMAIN}</span> email keep the
            marketplace closed to campus.
          </p>

          {status === 'success' ? (
            <div
              role="status"
              className="rise mt-10 flex items-center gap-3 border-2 border-ink bg-sun px-4 py-3.5 font-mono text-sm"
              style={{ '--d': '300ms' }}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-paper">✓</span>
              <span>
                {signingIn ? 'If you have an account, check ' : 'Check '}
                <strong>{values.email.trim()}</strong> for your sign-in link.
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rise mt-10 border-2 border-ink bg-white p-6 shadow-hard sm:p-8"
              style={{ '--d': '300ms' }}
            >
              {fields.filter(f => !signingIn || f.key === 'email').map((f) => {
                const fieldId = `${id}-${f.key}`
                const err = errors[f.key]
                return (
                  <div key={f.key} className="mb-5 last:mb-0">
                    <label htmlFor={fieldId} className={labelClass}>
                      {f.label}
                    </label>
                    <input
                      id={fieldId}
                      type={f.type}
                      inputMode={f.inputMode}
                      autoComplete={f.autoComplete}
                      placeholder={f.placeholder}
                      value={values[f.key]}
                      onChange={setField(f.key)}
                      aria-invalid={!!err}
                      aria-describedby={err ? `${fieldId}-error` : undefined}
                      className={`mt-2 ${inputClass}`}
                    />
                    {err && (
                      <p id={`${fieldId}-error`} className="mt-2 font-mono text-xs text-cherry">
                        {err}
                      </p>
                    )}
                  </div>
                )
              })}
              {errors.form && <p role="alert" className="mt-4 text-sm text-cherry">{errors.form}</p>}
              <button type="submit" disabled={status === 'sending'} className="btn-primary mt-7 w-full disabled:opacity-50">
                {status === 'sending' ? 'Sending…' : 'Send sign-in link →'}
              </button>
            </form>
          )}

          <button type="button" className="mt-6 font-mono text-xs underline" disabled={status === 'sending'} onClick={() => {
            setSigningIn(!signingIn)
            setErrors({})
            setStatus('idle')
          }}>
            {signingIn ? 'New here? Create an account' : 'Already registered? Sign in'}
          </button>

          {import.meta.env.DEV && (
            <p className="mt-6 text-sm text-ink/70">
              Local preview: open sign-in emails in <a className="underline" href="http://127.0.0.1:54324" target="_blank" rel="noreferrer">Mailpit</a>.
            </p>
          )}

          <p className="rise mt-4 font-mono text-[11px] uppercase tracking-widest text-ink/50" style={{ '--d': '400ms' }}>
            Verified students only · English-first · Free
          </p>
        </div>
      </main>
    </div>
  )
}

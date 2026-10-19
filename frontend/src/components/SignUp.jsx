import { useId, useState } from 'react'
import { Wordmark } from './Logo'

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

  function validate(v) {
    const errs = {}
    if (!v.name.trim()) errs.name = 'Enter your full name.'
    if (!STUDENT_ID.test(v.studentId.trim())) errs.studentId = 'Enter your 9-digit student ID.'
    if (!TEMPLE_EMAIL.test(v.email.trim().toLowerCase()))
      errs.email = `Use your ${DOMAIN} email — HUS is for verified Temple students only.`
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    setStatus(Object.keys(errs).length ? 'error' : 'success')
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
          <p className="rise eyebrow text-cherry">Create account</p>
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
                Account created. We sent a verification link to <strong>{values.email.trim()}</strong>.
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rise mt-10 border-2 border-ink bg-white p-6 shadow-hard sm:p-8"
              style={{ '--d': '300ms' }}
            >
              {fields.map((f) => {
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
              <button type="submit" className="btn-primary mt-7 w-full">
                Create account →
              </button>
            </form>
          )}

          <p className="rise mt-4 font-mono text-[11px] uppercase tracking-widest text-ink/50" style={{ '--d': '400ms' }}>
            Verified students only · English-first · Free
          </p>
        </div>
      </main>
    </div>
  )
}

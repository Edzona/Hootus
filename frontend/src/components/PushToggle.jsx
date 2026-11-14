import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushStatus } from '../lib/push'

const notes = {
  unsupported: 'This browser can’t show Hootus notifications.',
  unavailable: 'Notifications aren’t set up on this server yet.',
  blocked: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then reload.',
}

// Dev beta control for browser notifications on this device.
export default function PushToggle() {
  const [status, setStatus] = useState('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    pushStatus().then(value => { if (active) setStatus(value) }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [])

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      if (status === 'on') await disablePush()
      else await enablePush()
    } catch (err) {
      setError(err.message)
    }
    setStatus(await pushStatus().catch(() => status))
    setBusy(false)
  }

  if (status === 'loading' && !error) return null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {(status === 'on' || status === 'off') && (
        <button type="button" onClick={toggle} disabled={busy}
          className="border-2 border-ink bg-white px-3 py-2 font-mono text-xs font-bold hover:bg-paper disabled:opacity-50">
          {busy ? 'Working…' : status === 'on' ? 'Turn off notifications on this device' : 'Turn on notifications on this device'}
        </button>
      )}
      {notes[status] && <p className="text-sm text-ink/70">{notes[status]}</p>}
      {error && <p role="alert" className="text-sm text-cherry">{error}</p>}
    </div>
  )
}

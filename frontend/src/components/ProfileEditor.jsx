import { useId, useState } from 'react'
import { apiRequest } from '../lib/api'

const MAX_BIO = 500

export default function ProfileEditor({ profile, onSaved }) {
  const [bio, setBio] = useState(profile.bio || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const bioId = useId()
  const changed = bio.trim() !== (profile.bio || '')

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const saved = await apiRequest('/profile/me', { method: 'PATCH', body: { bio } })
      onSaved(saved)
      setBio(saved.bio || '')
      setMessage({ error: false, text: 'Bio saved.' })
    } catch (error) {
      setMessage({ error: true, text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="border-2 border-ink bg-white p-6 shadow-hard md:col-span-2 md:p-8">
      <label htmlFor={bioId} className="eyebrow">02 / Your bio</label>
      <textarea id={bioId} value={bio} onChange={event => setBio(event.target.value)} maxLength={MAX_BIO}
        rows={5} disabled={saving} placeholder="Major, year, clubs, what you're looking for on campus…"
        className="mt-6 w-full resize-y border-2 border-ink bg-paper p-4 text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" />
      <p className="mt-1 text-right font-mono text-xs text-ink/60">{bio.length}/{MAX_BIO}</p>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <button type="submit" className="btn-primary disabled:opacity-50" disabled={saving || !changed}>
          {saving ? 'Saving…' : 'Save bio →'}
        </button>
        {message && (
          <p role={message.error ? 'alert' : 'status'} className={message.error ? 'text-cherry' : 'text-ink/70'}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  )
}

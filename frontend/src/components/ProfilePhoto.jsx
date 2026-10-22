import { useEffect, useId, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import { apiRequest } from '../lib/api'

const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const photoTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const avatarMarker = '/storage/v1/object/public/avatars/'

// File path inside the avatars bucket, or null for anything else.
function avatarPath(url) {
  const index = url ? url.indexOf(avatarMarker) : -1
  return index === -1 ? null : url.slice(index + avatarMarker.length)
}

// The campus-card photo: choosing a file uploads and saves it straight away.
export default function ProfilePhoto({ profile, initials, onSaved }) {
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputId = useId()

  // Free the local preview when it is replaced or the card unmounts.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  async function savePhoto(avatarUrl, uploadedPath) {
    const storage = getSupabase().storage.from('avatars')
    try {
      const saved = await apiRequest('/profile/me', { method: 'PATCH', body: { avatar_url: avatarUrl } })
      // Best effort: remove the replaced photo so old files do not pile up.
      const oldPath = avatarPath(profile.avatar_url)
      if (oldPath && oldPath !== uploadedPath) await storage.remove([oldPath])
      onSaved(saved)
    } catch (err) {
      if (uploadedPath) await storage.remove([uploadedPath])
      throw err
    }
  }

  async function choosePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!photoTypes[file.type]) return setError('Choose a JPEG, PNG or WebP image.')
    if (file.size > MAX_PHOTO_BYTES) return setError('Photos must be 2 MB or smaller.')
    setError('')
    setBusy(true)
    setPreview(URL.createObjectURL(file))
    try {
      const { data } = await getSupabase().auth.getSession()
      if (!data.session) throw new Error('Please sign in again.')
      // Storage only accepts files inside your own folder: avatars/<your Auth ID>/.
      const path = `${data.session.user.id}/${crypto.randomUUID()}.${photoTypes[file.type]}`
      const storage = getSupabase().storage.from('avatars')
      const upload = await storage.upload(path, file, { contentType: file.type })
      if (upload.error) throw new Error('Your photo could not be uploaded. Please try again.')
      await savePhoto(storage.getPublicUrl(path).data.publicUrl, path)
    } catch (err) {
      setError(err.message)
    } finally {
      setPreview(null)
      setBusy(false)
    }
  }

  async function removePhoto() {
    setError('')
    setBusy(true)
    try {
      await savePhoto(null, null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const shown = preview || profile.avatar_url

  return (
    <div>
      <div className="grid h-24 w-24 place-items-center overflow-hidden border-2 border-ink bg-matcha font-display text-4xl font-bold">
        {shown
          ? <img src={shown} alt="" className={`h-full w-full object-cover ${busy ? 'opacity-50' : ''}`} />
          : initials}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label htmlFor={inputId}
          className={`font-mono text-xs uppercase tracking-widest underline ${busy ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
          {busy ? 'Saving…' : profile.avatar_url ? 'Change photo' : 'Add photo'}
        </label>
        <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
          onChange={choosePhoto} disabled={busy} />
        {profile.avatar_url && !busy && (
          <button type="button" onClick={removePhoto}
            className="font-mono text-xs uppercase tracking-widest text-cherry underline">
            Remove
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-cherry">{error}</p>}
    </div>
  )
}

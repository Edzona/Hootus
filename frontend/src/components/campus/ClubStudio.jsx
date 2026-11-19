import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../lib/api'
import { LISTING_PHOTO_LIMIT, removeListingPhotos, uploadListingPhotos } from '../../lib/listingPhotos'
import { ClubCategory, ClubColor, EventPoster, allCategories, clubCategories } from '../../../../backend/src/types/clubOptions'

const colors = [[ClubColor.Plum, 'Plum'], [ClubColor.Forest, 'Forest'], [ClubColor.Blue, 'Blue'], [ClubColor.Gold, 'Gold'], [ClubColor.Rose, 'Rose']]
const posters = [[EventPoster.Film, 'Film / Screening'], [EventPoster.Photo, 'Photo / Art'], [EventPoster.Outdoor, 'Outdoors / Meetup']]
const emptyEventForm = {
  title: '', startsAt: '', endsAt: '', location: '', price: 'Free entry', eventType: 'Meetup', poster: EventPoster.Film, description: '', note: '',
}

export default function ClubStudio({ clubs, events, profile, onRefresh, onNotice }) {
  const managed = clubs.filter((c) => c.canPost)
  const isPartner = profile?.role === 'partner'
  const canPostOffers = profile?.role === 'admin' || isPartner || managed.length > 0
  const [selectedId, setSelectedId] = useState(() => managed[0]?.id || '')
  const activeClub = managed.find((c) => c.id === selectedId) || managed[0] || null

  const [tab, setTab] = useState(() => (managed.length ? 'members' : canPostOffers ? 'publish' : 'members'))
  const [publishKind, setPublishKind] = useState(() => (managed.length ? 'post' : 'offer'))
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  const [eventForm, setEventForm] = useState(emptyEventForm)
  const [eventPhotos, setEventPhotos] = useState([])
  const [eventPhotoKey, setEventPhotoKey] = useState(0)
  const [postText, setPostText] = useState('')
  const [postEventId, setPostEventId] = useState('')
  const [postPhotos, setPostPhotos] = useState([])
  const [postPhotoKey, setPostPhotoKey] = useState(0)
  const [offerForm, setOfferForm] = useState({
    title: '', businessName: '', couponCode: '', expiresAt: '', body: '',
  })
  const [offerPhotos, setOfferPhotos] = useState([])
  const [offerPhotoKey, setOfferPhotoKey] = useState(0)
  const [settingsForm, setSettingsForm] = useState({
    name: '', category: ClubCategory.ArtsCulture, description: '', meeting: '', location: '', mark: '', color: ClubColor.Plum,
  })

  const [requests, setRequests] = useState([])
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyForm, setApplyForm] = useState({
    name: '', handle: '', category: ClubCategory.ArtsCulture, description: '', meeting: '', location: '', verificationNote: '',
  })
  const settingsKey = activeClub ? JSON.stringify([
    activeClub.id,
    activeClub.name || '',
    activeClub.category || ClubCategory.ArtsCulture,
    activeClub.description || '',
    activeClub.meeting || '',
    activeClub.location || '',
    activeClub.mark || '',
    activeClub.color || ClubColor.Plum,
  ]) : ''

  function showConfirmed(message) {
    setConfirmation(message)
    onNotice(message)
  }

  const loadMembers = useCallback(async (clubId) => {
    if (!clubId) { setMembers([]); return }
    setMembersLoading(true)
    try {
      setMembers(await apiRequest(`/campus/clubs/${clubId}/members`))
    } catch (err) {
      onNotice(err.message)
    } finally {
      setMembersLoading(false)
    }
  }, [onNotice])

  const loadMyRequests = useCallback(async () => {
    try {
      setRequests(await apiRequest('/campus/club-requests'))
    } catch {
      // ignore if empty
    }
  }, [])

  useEffect(() => { loadMyRequests() }, [loadMyRequests])

  useEffect(() => {
    if (activeClub?.id) loadMembers(activeClub.id)
    else setMembers([])
  }, [activeClub?.id, loadMembers])

  useEffect(() => {
    if (!settingsKey) return
    const [, name, category, description, meeting, location, mark, color] = JSON.parse(settingsKey)
    setSettingsForm({ name, category, description, meeting, location, mark, color })
  }, [settingsKey])

  async function updateMember(memberId, body, message) {
    if (!activeClub) return
    setBusy(true)
    try {
      await apiRequest(`/campus/clubs/${activeClub.id}/members/${memberId}`, { method: 'PATCH', body })
      showConfirmed(message)
      await Promise.all([loadMembers(activeClub.id), onRefresh()])
    } catch (err) {
      onNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function removeMember(member) {
    if (!activeClub || !window.confirm(`Remove ${member.name || 'this member'} from ${activeClub.name}?`)) return
    setBusy(true)
    try {
      await apiRequest(`/campus/clubs/${activeClub.id}/members/${member.id}`, { method: 'DELETE' })
      showConfirmed('Member removed.')
      await Promise.all([loadMembers(activeClub.id), onRefresh()])
    } catch (err) {
      onNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitWithPhotos(files, send, message) {
    if (files.length > LISTING_PHOTO_LIMIT) {
      onNotice(`Choose up to ${LISTING_PHOTO_LIMIT} photos.`)
      return false
    }
    setBusy(true)
    try {
      const uploaded = await uploadListingPhotos(files)
      try {
        await send(uploaded.urls)
      } catch (err) {
        await removeListingPhotos(uploaded.paths)
        throw err
      }
      showConfirmed(message)
      await onRefresh()
      return true
    } catch (err) {
      onNotice(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function createEvent(e) {
    e.preventDefault()
    if (!activeClub) return
    const starts = new Date(eventForm.startsAt)
    const ends = new Date(eventForm.endsAt)
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends <= starts) {
      onNotice('End time must be after start time.')
      return
    }
    const ok = await submitWithPhotos(
      eventPhotos,
      (image_urls) => apiRequest(`/campus/clubs/${activeClub.id}/events`, {
        method: 'POST',
        body: {
          title: eventForm.title.trim(),
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
          location: eventForm.location.trim(),
          price: eventForm.price.trim() || 'Free entry',
          event_type: eventForm.eventType.trim() || 'Meetup',
          poster: eventForm.poster,
          description: eventForm.description.trim(),
          note: eventForm.note.trim(),
          image_urls,
        },
      }),
      `Event published for ${activeClub.name}!`,
    )
    if (ok) {
      setEventForm(emptyEventForm)
      setEventPhotos([])
      setEventPhotoKey((k) => k + 1)
    }
  }

  async function publishPost(e) {
    e.preventDefault()
    if (!activeClub || !postText.trim()) return
    const ok = await submitWithPhotos(
      postPhotos,
      (image_urls) => apiRequest(`/campus/clubs/${activeClub.id}/posts`, {
        method: 'POST',
        body: { text: postText.trim(), image_urls, ...(postEventId ? { eventId: postEventId } : {}) },
      }),
      `Club update posted to ${activeClub.name}!`,
    )
    if (ok) {
      setPostText('')
      setPostEventId('')
      setPostPhotos([])
      setPostPhotoKey((k) => k + 1)
    }
  }

  async function publishOffer(e) {
    e.preventDefault()
    const ok = await submitWithPhotos(
      offerPhotos,
      (image_urls) => apiRequest('/feed', {
        method: 'POST',
        body: {
          kind: 'perk',
          title: offerForm.title.trim(),
          business_name: offerForm.businessName.trim(),
          body: offerForm.body.trim(),
          image_urls,
          ...(offerForm.couponCode.trim() ? { coupon_code: offerForm.couponCode.trim() } : {}),
          ...(offerForm.expiresAt ? { expires_at: new Date(offerForm.expiresAt).toISOString() } : {}),
        },
      }),
      'Promotional offer published to Events & Offers!',
    )
    if (ok) {
      setOfferForm({ title: '', businessName: '', couponCode: '', expiresAt: '', body: '' })
      setOfferPhotos([])
      setOfferPhotoKey((k) => k + 1)
    }
  }

  async function saveClubSettings(e) {
    e.preventDefault()
    if (!activeClub) return
    setBusy(true)
    try {
      await apiRequest(`/campus/clubs/${activeClub.id}`, {
        method: 'PATCH',
        body: {
          name: settingsForm.name.trim(),
          category: settingsForm.category,
          description: settingsForm.description.trim(),
          meeting: settingsForm.meeting.trim(),
          location: settingsForm.location.trim(),
          mark: settingsForm.mark.trim(),
          color: settingsForm.color,
        },
      })
      showConfirmed(`Updated ${settingsForm.name.trim()}!`)
      await onRefresh()
    } catch (err) {
      onNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitClubRequest(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await apiRequest('/campus/club-requests', {
        method: 'POST',
        body: {
          name: applyForm.name.trim(),
          handle: applyForm.handle.trim(),
          category: applyForm.category,
          description: applyForm.description.trim(),
          meeting: applyForm.meeting.trim(),
          location: applyForm.location.trim(),
          verificationNote: applyForm.verificationNote.trim(),
        },
      })
      setApplyForm({ name: '', handle: '', category: ClubCategory.ArtsCulture, description: '', meeting: '', location: '', verificationNote: '' })
      setApplyOpen(false)
      showConfirmed('Club request submitted for admin verification.')
      await loadMyRequests()
    } catch (err) {
      onNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  const pending = members.filter((m) => m.status === 'pending')
  const approved = members.filter((m) => m.status === 'approved')
  const managerCount = approved.filter((m) => m.role === 'manager').length
  const clubEvents = activeClub ? events.filter((e) => e.club === activeClub.id) : []

  const studioTabs = [
    ...(activeClub ? [['members', `Members${pending.length ? ` (${pending.length})` : ''}`]] : []),
    ...((activeClub || canPostOffers) ? [['publish', 'Publish']] : []),
    ...(activeClub ? [['settings', 'Settings']] : []),
  ]

  return (
    <div className="space-y-5 px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Club Studio</h1>
          <p className="mt-0.5 text-sm text-ink/60">Manage members, create events, and publish updates.</p>
        </div>
        {!isPartner && (
          <button
            type="button"
            onClick={() => setApplyOpen((v) => !v)}
            className="rounded-lg border border-[#ebe7e4] bg-white px-3.5 py-2 text-xs font-semibold text-ink transition hover:border-ink/40"
          >
            {applyOpen ? 'Close form' : '+ Start a club'}
          </button>
        )}
      </div>

      {managed.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ebe7e4] bg-[#faf8f6] px-4 py-2.5">
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/55">Managing</span>
            <select
              aria-label="Select managed club"
              value={activeClub?.id || ''}
              onChange={(e) => { setSelectedId(e.target.value); setConfirmation('') }}
              className="rounded-lg border border-[#ebe7e4] bg-white px-3 py-1.5 text-sm font-semibold text-ink focus:border-ink/40 focus:outline-none"
            >
              {managed.map((club) => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </select>
          </label>
          {activeClub && (
            <a href={`#/clubs/${activeClub.id}`} className="text-xs font-medium text-cherry hover:underline">
              View club page →
            </a>
          )}
        </div>
      )}

      {confirmation && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-[#d4e4d7] bg-[#edf4ee] px-4 py-3 text-sm font-medium text-[#2d5a3b]">
          <span>✓ {confirmation}</span>
          <button type="button" onClick={() => setConfirmation('')} aria-label="Dismiss confirmation" className="font-mono text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {applyOpen && (
        <form onSubmit={submitClubRequest} className="space-y-4 rounded-2xl border border-[#ebe7e4] bg-white p-5">
          <h2 className="font-display text-lg font-bold">Apply to create a verified TUJ club</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="font-mono uppercase text-ink/60">Club name</span>
              <input required minLength={2} maxLength={100} value={applyForm.name} onChange={(e) => setApplyForm((f) => ({ ...f, name: e.target.value }))} placeholder="TUJ Board Games" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs">
              <span className="font-mono uppercase text-ink/60">Handle (letters/numbers/_)</span>
              <input required minLength={2} maxLength={40} pattern="[a-zA-Z0-9_]+" value={applyForm.handle} onChange={(e) => setApplyForm((f) => ({ ...f, handle: e.target.value }))} placeholder="tujboardgames" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 font-mono text-sm" />
            </label>
            <label className="block text-xs">
              <span className="font-mono uppercase text-ink/60">Category</span>
              <select value={applyForm.category} onChange={(e) => setApplyForm((f) => ({ ...f, category: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] bg-white px-3 py-2 text-sm">
                {clubCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-xs">
              <span className="font-mono uppercase text-ink/60">Typical meeting time</span>
              <input maxLength={120} value={applyForm.meeting} onChange={(e) => setApplyForm((f) => ({ ...f, meeting: e.target.value }))} placeholder="Thursdays, 17:00" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs">
            <span className="font-mono uppercase text-ink/60">Campus location</span>
            <input maxLength={120} value={applyForm.location} onChange={(e) => setApplyForm((f) => ({ ...f, location: e.target.value }))} placeholder="Student lounge" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs">
            <span className="font-mono uppercase text-ink/60">Description</span>
            <textarea required minLength={10} maxLength={1000} rows={3} value={applyForm.description} onChange={(e) => setApplyForm((f) => ({ ...f, description: e.target.value }))} placeholder="What your club is about…" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs">
            <span className="font-mono uppercase text-ink/60">Verification details (for admin review)</span>
            <textarea required minLength={5} maxLength={500} rows={2} value={applyForm.verificationNote} onChange={(e) => setApplyForm((f) => ({ ...f, verificationNote: e.target.value }))} placeholder="Advisor name, student org registration, or founding members…" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
          </label>
          <button type="submit" disabled={busy} className="campus-button">Submit for verification</button>
        </form>
      )}

      {requests.length > 0 && (
        <section className="rounded-2xl border border-[#ebe7e4] bg-white p-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink/55">Your club applications</p>
          <ul className="mt-3 divide-y divide-[#ebe7e4]">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <strong>{r.name}</strong> <span className="font-mono text-xs text-ink/55">@{r.handle}</span>
                  {r.review_note && <p className="text-xs text-ink/65">Admin note: {r.review_note}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase ${r.status === 'approved' ? 'bg-matcha/40 text-ink' : r.status === 'rejected' ? 'bg-cherry/15 text-cherry' : 'bg-sun/60 text-ink'}`}>
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {managed.length === 0 && !canPostOffers ? (
        <div className="rounded-2xl border border-[#ebe7e4] bg-white p-6 text-sm text-ink/70">
          You don’t manage any clubs yet. Click <strong>+ Start a club</strong> above to apply, or ask a club manager to promote you after joining.
        </div>
      ) : (
        <>
          <div className="feed-tabs" role="tablist" aria-label="Club Studio sections">
            {studioTabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'members' && activeClub && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-[#ebe7e4] bg-white p-5">
                <h2 className="font-display text-base font-bold">Pending join requests ({pending.length})</h2>
                {membersLoading ? <p className="mt-3 text-sm text-ink/60">Loading…</p>
                  : pending.length === 0 ? <p className="mt-2 text-sm text-ink/60">No pending requests.</p>
                    : (
                      <ul className="mt-3 divide-y divide-[#ebe7e4]">
                        {pending.map((m) => (
                          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                            <span><strong>{m.name || 'TUJ Student'}</strong></span>
                            <div className="flex gap-2">
                              <button type="button" disabled={busy} onClick={() => updateMember(m.id, { status: 'approved' }, 'Member approved.')} className="rounded-full bg-ink px-3 py-1 font-mono text-xs text-paper">
                                Approve
                              </button>
                              <button type="button" disabled={busy} onClick={() => updateMember(m.id, { status: 'rejected' }, 'Request declined.')} className="rounded-full border border-[#ebe7e4] px-3 py-1 font-mono text-xs text-cherry">
                                Decline
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
              </section>

              <section className="rounded-2xl border border-[#ebe7e4] bg-white p-5">
                <h2 className="font-display text-base font-bold">Approved members ({approved.length})</h2>
                {approved.length === 0 ? <p className="mt-2 text-sm text-ink/60">No approved members yet.</p> : (
                  <ul className="mt-3 divide-y divide-[#ebe7e4]">
                    {approved.map((m) => {
                      const isLastManager = m.role === 'manager' && managerCount <= 1
                      const cantManage = m.is_me || isLastManager
                      return (
                        <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <strong>{m.name || 'TUJ Student'}</strong>
                            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${m.role === 'manager' ? 'bg-sun/70 text-ink' : 'bg-[#f5f2ef] text-ink/70'}`}>
                              {m.role}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {cantManage ? (
                              <span className="text-xs text-ink/45">
                                {m.is_me ? 'You' : 'Required manager'}
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => updateMember(m.id, { role: m.role === 'manager' ? 'member' : 'manager' }, m.role === 'manager' ? 'Demoted to member.' : 'Promoted to manager.')}
                                  className="rounded-lg border border-[#ebe7e4] bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-ink/40"
                                >
                                  {m.role === 'manager' ? 'Make member' : 'Make manager'}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => removeMember(m)}
                                  className="rounded-lg border border-[#ebe7e4] bg-white px-3 py-1.5 text-xs font-medium text-cherry hover:border-cherry/40"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}

          {tab === 'publish' && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {activeClub && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPublishKind('post')}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${publishKind === 'post' ? 'border-ink bg-ink text-paper' : 'border-[#ebe7e4] bg-white text-ink hover:border-ink/40'}`}
                    >
                      Club Post
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishKind('event')}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${publishKind === 'event' ? 'border-ink bg-ink text-paper' : 'border-[#ebe7e4] bg-white text-ink hover:border-ink/40'}`}
                    >
                      Event
                    </button>
                  </>
                )}
                {canPostOffers && (
                  <button
                    type="button"
                    onClick={() => setPublishKind('offer')}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${publishKind === 'offer' ? 'border-ink bg-ink text-paper' : 'border-[#ebe7e4] bg-white text-ink hover:border-ink/40'}`}
                  >
                    Promotional Offer
                  </button>
                )}
              </div>

              {publishKind === 'post' && activeClub && (
                <form onSubmit={publishPost} className="space-y-4 rounded-2xl border border-[#ebe7e4] bg-white p-5">
                  <h2 className="font-display text-base font-bold">Post as {activeClub.name}</h2>
                  <textarea
                    required
                    rows={4}
                    maxLength={10000}
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="Share an update with students…"
                    className="w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm"
                  />
                  <label className="block text-xs">
                    <span className="font-mono uppercase text-ink/60">Photos (optional, up to {LISTING_PHOTO_LIMIT})</span>
                    <input
                      key={postPhotoKey}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => setPostPhotos(Array.from(e.target.files ?? []))}
                      className="mt-1 block w-full font-mono text-xs"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <select value={postEventId} onChange={(e) => setPostEventId(e.target.value)} className="rounded-lg border border-[#ebe7e4] bg-white px-3 py-2 text-sm">
                      <option value="">No event attached</option>
                      {clubEvents.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                    </select>
                    <button type="submit" disabled={busy || !postText.trim()} className="campus-button">
                      {busy ? 'Publishing…' : 'Publish update'}
                    </button>
                  </div>
                </form>
              )}

              {publishKind === 'event' && activeClub && (
                <div className="space-y-5">
                  <form onSubmit={createEvent} className="space-y-4 rounded-2xl border border-[#ebe7e4] bg-white p-5">
                    <h2 className="font-display text-base font-bold">New event for {activeClub.name}</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs sm:col-span-2">
                        <span className="font-mono uppercase text-ink/60">Title</span>
                        <input required maxLength={200} value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} placeholder="Friday movie night" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-xs">
                        <span className="font-mono uppercase text-ink/60">Starts</span>
                        <input required type="datetime-local" value={eventForm.startsAt} onChange={(e) => setEventForm((f) => ({ ...f, startsAt: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-xs">
                        <span className="font-mono uppercase text-ink/60">Ends</span>
                        <input required type="datetime-local" value={eventForm.endsAt} onChange={(e) => setEventForm((f) => ({ ...f, endsAt: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-xs">
                        <span className="font-mono uppercase text-ink/60">Location</span>
                        <input required maxLength={300} value={eventForm.location} onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))} placeholder="Campus screening room" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-xs">
                        <span className="font-mono uppercase text-ink/60">Price</span>
                        <input maxLength={100} value={eventForm.price} onChange={(e) => setEventForm((f) => ({ ...f, price: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-xs">
                        <span className="font-mono uppercase text-ink/60">Event type</span>
                        <input required maxLength={80} value={eventForm.eventType} onChange={(e) => setEventForm((f) => ({ ...f, eventType: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-xs">
                        <span className="font-mono uppercase text-ink/60">Poster art</span>
                        <select value={eventForm.poster} onChange={(e) => setEventForm((f) => ({ ...f, poster: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] bg-white px-3 py-2 text-sm">
                          {posters.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="block text-xs">
                      <span className="font-mono uppercase text-ink/60">Description</span>
                      <textarea rows={3} maxLength={10000} value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-xs">
                      <span className="font-mono uppercase text-ink/60">Photos (optional, up to {LISTING_PHOTO_LIMIT})</span>
                      <input
                        key={eventPhotoKey}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={(e) => setEventPhotos(Array.from(e.target.files ?? []))}
                        className="mt-1 block w-full font-mono text-xs"
                      />
                    </label>
                    <button type="submit" disabled={busy} className="campus-button">{busy ? 'Creating…' : 'Create event'}</button>
                  </form>

                  {clubEvents.length > 0 && (
                    <section className="rounded-2xl border border-[#ebe7e4] bg-white p-5">
                      <h3 className="font-display text-base font-bold">Upcoming events for {activeClub.name}</h3>
                      <ul className="mt-3 divide-y divide-[#ebe7e4] text-sm">
                        {clubEvents.map((ev) => (
                          <li key={ev.id} className="flex items-center justify-between gap-3 py-2.5">
                            <a href={`#/events/${ev.id}`} className="font-medium hover:underline">{ev.title}</a>
                            <span className="font-mono text-xs text-ink/60">{ev.month} {ev.day}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}

              {publishKind === 'offer' && canPostOffers && (
                <form onSubmit={publishOffer} className="space-y-4 rounded-2xl border border-[#ebe7e4] bg-white p-5">
                  <h2 className="font-display text-base font-bold">Publish promotional offer</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs sm:col-span-2">
                      <span className="font-mono uppercase text-ink/60">Offer title</span>
                      <input required maxLength={200} value={offerForm.title} onChange={(e) => setOfferForm((f) => ({ ...f, title: e.target.value }))} placeholder="15% off iced matcha" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-xs">
                      <span className="font-mono uppercase text-ink/60">Business name</span>
                      <input required maxLength={200} value={offerForm.businessName} onChange={(e) => setOfferForm((f) => ({ ...f, businessName: e.target.value }))} placeholder="Sancha Roastery" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-xs">
                      <span className="font-mono uppercase text-ink/60">Coupon code (optional)</span>
                      <input maxLength={100} value={offerForm.couponCode} onChange={(e) => setOfferForm((f) => ({ ...f, couponCode: e.target.value }))} placeholder="TUJ15" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 font-mono text-sm" />
                    </label>
                    <label className="block text-xs sm:col-span-2">
                      <span className="font-mono uppercase text-ink/60">Expires at (optional)</span>
                      <input type="datetime-local" value={offerForm.expiresAt} onChange={(e) => setOfferForm((f) => ({ ...f, expiresAt: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <label className="block text-xs">
                    <span className="font-mono uppercase text-ink/60">Details</span>
                    <textarea rows={3} maxLength={10000} value={offerForm.body} onChange={(e) => setOfferForm((f) => ({ ...f, body: e.target.value }))} placeholder="Show your TUJ ID at checkout…" className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-xs">
                    <span className="font-mono uppercase text-ink/60">Photos (optional, up to {LISTING_PHOTO_LIMIT})</span>
                    <input
                      key={offerPhotoKey}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => setOfferPhotos(Array.from(e.target.files ?? []))}
                      className="mt-1 block w-full font-mono text-xs"
                    />
                  </label>
                  <button type="submit" disabled={busy} className="campus-button">
                    {busy ? 'Publishing…' : 'Publish promotional offer'}
                  </button>
                </form>
              )}
            </div>
          )}

          {tab === 'settings' && activeClub && (
            <form onSubmit={saveClubSettings} className="space-y-4 rounded-2xl border border-[#ebe7e4] bg-white p-5">
              <h2 className="font-display text-base font-bold">Edit {activeClub.orgType === 'partner' ? 'partner page' : 'club page'}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs">
                  <span className="font-mono uppercase text-ink/60">Name</span>
                  <input required minLength={2} maxLength={100} value={settingsForm.name} onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs">
                  <span className="font-mono uppercase text-ink/60">Category</span>
                  <select value={settingsForm.category} onChange={(e) => setSettingsForm((f) => ({ ...f, category: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] bg-white px-3 py-2 text-sm">
                    {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="font-mono uppercase text-ink/60">{activeClub.orgType === 'partner' ? 'Hours / Contact' : 'Meeting time'}</span>
                  <input maxLength={120} value={settingsForm.meeting} onChange={(e) => setSettingsForm((f) => ({ ...f, meeting: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs">
                  <span className="font-mono uppercase text-ink/60">Location</span>
                  <input maxLength={120} value={settingsForm.location} onChange={(e) => setSettingsForm((f) => ({ ...f, location: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs">
                  <span className="font-mono uppercase text-ink/60">Icon / Initials (1–4 chars)</span>
                  <input required minLength={1} maxLength={4} value={settingsForm.mark} onChange={(e) => setSettingsForm((f) => ({ ...f, mark: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 font-mono text-sm" />
                </label>
                <label className="block text-xs">
                  <span className="font-mono uppercase text-ink/60">Theme color</span>
                  <select value={settingsForm.color} onChange={(e) => setSettingsForm((f) => ({ ...f, color: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] bg-white px-3 py-2 text-sm">
                    {colors.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-xs">
                <span className="font-mono uppercase text-ink/60">Description</span>
                <textarea required minLength={10} maxLength={1000} rows={3} value={settingsForm.description} onChange={(e) => setSettingsForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#ebe7e4] px-3 py-2 text-sm" />
              </label>
              <button type="submit" disabled={busy} className="campus-button">
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}

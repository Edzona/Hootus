import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import { formatPrice } from '../lib/format'
import { emptyListingForm, listingToForm, saveListing } from '../lib/listings'
import ListingForm from './ListingForm'
import ReportButton from './ReportButton'
import { ModerationTarget } from '../../../backend/src/types/domain'
import { supabase } from '../lib/supabase'

const categoryLabels = { sales: 'For sale', gigs: 'Gigs', housing: 'Housing' }
const PAGE_SIZE = 50
const soldLabel = { sales: 'Mark as sold', gigs: 'Mark completed', housing: 'Mark as rented' }

function buildMailLinks(email, sellerName, listing) {
  const priceText = formatPrice(listing.price_jpy, listing.category)
  const subject = `[Hootus] Inquiry: ${listing.title}`
  const body = `Hi ${sellerName},\n\nI saw your listing "${listing.title}" (${priceText}) on Hootus and I'm interested. Is it still available?\n\nThanks!`
  return {
    subject,
    body,
    outlookUrl: `https://outlook.cloud.microsoft/mail/deeplink/compose?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  }
}

export default function ListingsHub({ mode }) {
  const isHousing = mode === 'housing'

  const [signedIn, setSignedIn] = useState(undefined)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('all')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const defaultCategory = isHousing ? 'housing' : 'sales'
  const [form, setForm] = useState(() => emptyListingForm(defaultCategory))
  const [photos, setPhotos] = useState([])
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [busy, setBusy] = useState(false)

  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(() => emptyListingForm('sales'))
  const [editPhotos, setEditPhotos] = useState([])
  const [contact, setContact] = useState(null)
  const [contactError, setContactError] = useState('')
  const [contactLoading, setContactLoading] = useState(false)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!supabase) { setSignedIn(false); setLoading(false); return }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session))
    }).catch(() => { if (active) setSignedIn(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(Boolean(session))
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  const loadListings = useCallback(async (offset = 0) => {
    if (offset === 0) setLoading(true)
    setError('')
    try {
      const categories = isHousing ? ['housing'] : filter === 'all' ? ['sales', 'gigs'] : [filter]
      const data = await apiRequest(`/listings?limit=${PAGE_SIZE}&offset=${offset}&category=${categories.join(',')}`)
      setListings((current) => (offset === 0 ? data : [
        ...current, ...data.filter((item) => !current.some((existing) => existing.id === item.id)),
      ]))
      setHasMore(data.length === PAGE_SIZE)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isHousing, filter])

  useEffect(() => {
    if (signedIn === true) loadListings()
    else if (signedIn === false) setLoading(false)
  }, [signedIn, loadListings])

  useEffect(() => {
    if (!selected) return
    const onKeyDown = (event) => { if (event.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected])

  useEffect(() => {
    setEditing(false)
    setEditPhotos([])
    if (!selected || selected.is_mine) {
      setContact(null)
      setContactError('')
      setContactLoading(false)
      return
    }
    let active = true
    setContact(null)
    setContactError('')
    setContactLoading(true)
    apiRequest(`/listings/${selected.id}/contact`)
      .then((data) => { if (active) setContact(data) })
      .catch((err) => { if (active) setContactError(err.message) })
      .finally(() => { if (active) setContactLoading(false) })
    return () => { active = false }
  }, [selected])

  function choosePhotos(setFiles) {
    return (event, max) => {
      const chosen = Array.from(event.target.files ?? [])
      if (chosen.length > max) {
        setError(`Choose up to ${max} photos.`)
        event.target.value = ''
        setFiles([])
        return
      }
      setError('')
      setFiles(chosen)
    }
  }

  // Runs one create/edit submit: busy flag, error display, and the follow-up on success.
  async function submitListing(event, request, onSaved) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      onSaved(await saveListing(request))
      await loadListings()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = (event) => submitListing(event, { path: '/listings', method: 'POST', form, photos }, () => {
    setForm(emptyListingForm(defaultCategory))
    setPhotos([])
    setPhotoInputKey((k) => k + 1)
    setComposerOpen(false)
  })

  const handleUpdate = (event) => submitListing(
    event, { path: `/listings/${selected.id}`, method: 'PATCH', form: editForm, photos: editPhotos },
    (updated) => { setSelected(updated); setEditing(false); setEditPhotos([]) },
  )

  function startEditing(listing) {
    setEditForm(listingToForm(listing))
    setEditPhotos([])
    setEditing(true)
  }

  async function handleStatus(listing, status) {
    const label = status === 'sold' ? (soldLabel[listing.category] || 'Mark as sold') : 'Remove listing'
    if (!window.confirm(`${label}: "${listing.title}"? It will no longer appear in active listings.`)) return
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/listings/${listing.id}/status`, { method: 'PATCH', body: { status } })
      setSelected(null)
      await loadListings()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function copyText(key, value) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    } catch {
      setContactError('Could not copy to clipboard.')
    }
  }

  const accentBg = isHousing ? 'bg-sky' : 'bg-matcha'
  const pageBg = isHousing ? 'bg-sky/15' : 'bg-matcha/15'

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className={`border-b-2 border-ink ${accentBg}`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-5 py-12 md:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink/70">
              {isHousing ? 'Rooms & sublets' : 'Buy, sell, trade'}
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {isHousing ? 'Real estate corner' : 'Student marketplace'}
            </h1>
            <p className="mt-3 max-w-md text-ink/80">
              {isHousing
                ? 'Sublets, sharehouses, and roommate searches near TUJ and Sangenjaya.'
                : 'Furniture, clothes, electronics, and student gigs — posted by TUJ students.'}
            </p>
          </div>
          {signedIn && (
            <button
              type="button"
              onClick={() => setComposerOpen((open) => !open)}
              className="border-2 border-ink bg-ink px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest text-paper transition-transform hover:-translate-y-0.5"
            >
              {composerOpen ? 'Close form' : '+ Post listing'}
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        {error && (
          <p role="alert" className="mb-6 border-2 border-ink bg-white p-4 font-mono text-sm text-cherry shadow-hard">
            {error}
          </p>
        )}
        {notice && <p role="status" className="mb-6 border-2 border-ink bg-sun/50 p-4 font-mono text-sm">{notice}</p>}

        {signedIn === false && (
          <div className="border-2 border-ink bg-white p-8 shadow-hard">
            <p className="font-display text-2xl font-bold">Sign in with your Temple email to browse &amp; post.</p>
            <a href="#/signup" className="btn-primary mt-5 inline-block">Sign in →</a>
          </div>
        )}

        {signedIn && composerOpen && (
          <ListingForm
            form={form}
            setForm={setForm}
            isHousing={isHousing}
            busy={busy}
            submitLabel={busy ? 'Posting…' : 'Publish listing'}
            onSubmit={handleCreate}
            onCancel={() => setComposerOpen(false)}
            onPhotos={choosePhotos(setPhotos)}
            photoInputKey={photoInputKey}
            className="mb-10 border-2 border-ink bg-white p-6 shadow-hard"
            heading={(
              <h2 className="mb-5 font-display text-2xl font-bold">
                {isHousing ? 'Post a housing listing' : 'Post a marketplace item'}
              </h2>
            )}
          />
        )}

        {signedIn && !isHousing && (
          <div className="mb-6 flex flex-wrap gap-2">
            {[['all', 'All'], ['sales', 'For sale'], ['gigs', 'Gigs']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`border-2 border-ink px-4 py-1.5 font-mono text-xs uppercase tracking-widest ${
                  filter === value ? 'bg-ink text-paper' : 'bg-white text-ink hover:bg-ink/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {signedIn && loading && <p className="text-ink/60">Loading listings…</p>}

        {signedIn && !loading && listings.length === 0 && (
          <div className="border-2 border-ink bg-white p-8 text-ink/70">
            Nothing posted here yet. Click <strong>+ Post listing</strong> to add the first one.
          </div>
        )}

        {signedIn && !loading && listings.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((item) => (
              <article key={item.id} className="flex flex-col border-2 border-ink bg-white shadow-hard transition-transform hover:-translate-y-1">
                <button type="button" onClick={() => setSelected(item)} className="group flex flex-1 flex-col text-left">
                  {item.image_urls?.[0] && (
                    <img src={item.image_urls[0]} alt={item.title} className="h-48 w-full border-b-2 border-ink object-cover" />
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-block border-2 border-ink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${accentBg}`}>
                        {categoryLabels[item.category] || item.category}
                      </span>
                      {item.is_mine && (
                        <span className="border border-ink bg-sun px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                          Yours
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 font-display text-xl font-bold leading-tight group-hover:underline">
                      {item.title}
                    </h2>
                    {item.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-ink/65">{item.description}</p>
                    )}
                    <div className="mt-auto pt-4">
                      <p className="font-mono text-base font-bold">{formatPrice(item.price_jpy, item.category)}</p>
                      <p className="mt-1 font-mono text-xs text-ink/60">
                        {item.author?.name || 'TUJ Student'}{item.location ? ` · ${item.location}` : ''}
                      </p>
                    </div>
                  </div>
                </button>
                <div className="border-t border-ink/20 px-5 py-2 text-right">
                  <ReportButton kind={ModerationTarget.Listing} id={item.id} onNotice={setNotice} className="font-mono text-[10px] uppercase tracking-widest text-ink/60 underline underline-offset-4 hover:text-cherry" />
                </div>
              </article>
            ))}
          </div>
        )}

        {signedIn && !loading && hasMore && (
          <div className="mt-8 text-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={async () => {
                setLoadingMore(true)
                await loadListings(listings.length)
                setLoadingMore(false)
              }}
              className="border-2 border-ink bg-white px-5 py-2 font-mono text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </main>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="listing-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-2 border-ink bg-paper p-6 shadow-hard">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`inline-block border-2 border-ink px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${accentBg}`}>
                  {categoryLabels[selected.category] || selected.category}
                </span>
                <h2 id="listing-modal-title" className="mt-3 font-display text-3xl font-extrabold leading-tight">
                  {selected.title}
                </h2>
                <p className="mt-1 font-mono text-lg font-bold">
                  {formatPrice(selected.price_jpy, selected.category)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close listing details"
                className="border-2 border-ink bg-white px-3 py-1 font-mono text-sm font-bold hover:bg-ink hover:text-paper"
              >
                ×
              </button>
            </div>

            {selected.image_urls?.length > 0 && (
              <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
                {selected.image_urls.map((url, idx) => (
                  <img
                    key={url}
                    src={url}
                    alt={`${selected.title} photo ${idx + 1}`}
                    className={`h-48 shrink-0 snap-center border-2 border-ink bg-white object-contain sm:h-56 ${
                      selected.image_urls.length > 1 ? 'w-[80%]' : 'w-full'
                    }`}
                  />
                ))}
              </div>
            )}

            <dl className="mt-3 grid grid-cols-2 gap-3 border-y-2 border-ink/20 py-2.5 font-mono text-xs">
              <div>
                <dt className="uppercase text-ink/60">Seller</dt>
                <dd className="mt-0.5 text-sm font-bold">{selected.author?.name || 'TUJ Student'}</dd>
              </div>
              {selected.location && (
                <div>
                  <dt className="uppercase text-ink/60">Location</dt>
                  <dd className="mt-0.5 text-sm">{selected.location}</dd>
                </div>
              )}
            </dl>

            {selected.description && (
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{selected.description}</p>
            )}

            {selected.is_mine ? (
              editing ? (
                <ListingForm
                  form={editForm}
                  setForm={setEditForm}
                  isHousing={isHousing}
                  busy={busy}
                  submitLabel={busy ? 'Saving…' : 'Save changes'}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditing(false)}
                  onPhotos={choosePhotos(setEditPhotos)}
                  className="mt-6 border-t-2 border-ink pt-5"
                />
              ) : (
                <div className="mt-6 flex flex-wrap gap-3 border-t-2 border-ink pt-5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startEditing(selected)}
                    className="border-2 border-ink bg-sun px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest"
                  >
                    Edit listing
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleStatus(selected, 'sold')}
                    className="border-2 border-ink bg-matcha px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest"
                  >
                    {soldLabel[selected.category] || 'Mark as sold'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleStatus(selected, 'closed')}
                    className="border-2 border-ink bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-cherry"
                  >
                    Remove listing
                  </button>
                </div>
              )
            ) : (
              <div className="mt-6 border-t-2 border-ink pt-5">
                <p className="eyebrow text-ink/70">Contact seller</p>
                {contactLoading && <p className="mt-2 text-sm text-ink/60">Loading seller email…</p>}
                {contactError && <p role="alert" className="mt-2 text-sm text-cherry">{contactError}</p>}
                {contact && (() => {
                  const links = buildMailLinks(contact.email, contact.sellerName, selected)
                  return (
                    <div className="mt-3 space-y-3">
                      <p className="font-mono text-xs text-ink/75">
                        Seller email:{' '}
                        <button
                          type="button"
                          onClick={() => copyText('email', contact.email)}
                          title="Click to copy email"
                          className="font-bold text-ink underline decoration-dotted underline-offset-4 hover:text-cherry"
                        >
                          {contact.email}
                        </button>
                        {copied === 'email' && <span className="ml-2 text-cherry">Copied ✓</span>}
                      </p>
                      <a
                        href={links.outlookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block border-2 border-ink bg-ink px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-paper"
                      >
                        Email seller ↗
                      </a>
                    </div>
                  )
                })()}
              </div>
            )}
            <div className="mt-6 border-t-2 border-ink/20 pt-4 text-right">
              <ReportButton kind={ModerationTarget.Listing} id={selected.id} onNotice={setNotice} className="font-mono text-xs uppercase tracking-widest text-ink/60 underline underline-offset-4 hover:text-cherry" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

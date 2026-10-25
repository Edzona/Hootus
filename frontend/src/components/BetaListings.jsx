import { useCallback, useEffect, useState } from 'react'
import { Wordmark } from './Logo'
import { apiRequest } from '../lib/api'
import { supabase } from '../lib/supabase'

// Dev-only test page for listings and listing chat. Polls instead of using Realtime.
const POLL_MS = 4000
// Every category uses status 'sold' for a successful outcome; only the wording differs.
const successLabel = { sales: 'Mark as sold', housing: 'Mark as rented', gigs: 'Mark as filled' }
const statusLabel = { active: 'active', sold: 'completed', closed: 'closed' }
const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })
const stamp = (value) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(value))

export default function BetaListings() {
  const [userId, setUserId] = useState(undefined)
  const [listings, setListings] = useState([])
  const [inbox, setInbox] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [form, setForm] = useState({ category: 'sales', title: '', price: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supabase) { setUserId(null); return }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // User actions clear the error first and show any failure.
  const run = useCallback(async (task) => {
    setError('')
    try { return await task() } catch (err) { setError(err.message); return undefined }
  }, [])

  const loadListings = useCallback(async () => {
    setListings(await apiRequest('/listings?limit=50'))
  }, [])
  const loadInbox = useCallback(async () => {
    setInbox(await apiRequest('/messaging/conversations?limit=50'))
  }, [])

  useEffect(() => {
    setListings([]); setInbox([]); setActiveId(null)
    if (!userId) return
    run(() => Promise.all([loadListings(), loadInbox()]))
  }, [userId, run, loadListings, loadInbox])

  // Load the open conversation, then poll it and the inbox.
  useEffect(() => {
    setConversation(null); setMessages([])
    if (!activeId) return
    let stopped = false
    const loadMessages = async () => {
      const page = await apiRequest(`/messaging/conversations/${activeId}/messages?limit=50`)
      if (!stopped) setMessages([...page.messages].reverse())
    }
    run(async () => {
      const header = await apiRequest(`/messaging/conversations/${activeId}`)
      if (!stopped) setConversation(header)
      await loadMessages()
    })
    const timer = setInterval(() => {
      // Background refreshes stay quiet; the next user action shows errors.
      loadMessages().catch(() => {})
      loadInbox().catch(() => {})
    }, POLL_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [activeId, run, loadInbox])

  async function createListing(event) {
    event.preventDefault()
    const price = form.price.trim() === '' ? null : Number(form.price)
    if (price !== null && (!Number.isInteger(price) || price < 0)) {
      setError('Price must be a whole number of yen, or left empty.')
      return
    }
    setBusy(true)
    const created = await run(() => apiRequest('/listings', {
      method: 'POST', body: { category: form.category, title: form.title, price_jpy: price },
    }))
    setBusy(false)
    if (created) {
      setForm(current => ({ ...current, title: '', price: '' }))
      run(loadListings)
    }
  }

  async function endListing(listing, status) {
    const question = status === 'sold'
      ? `${successLabel[listing.category]}: "${listing.title}"? It will stop accepting new conversations.`
      : `Close "${listing.title}" without a sale? It will stop accepting new conversations.`
    if (!window.confirm(question)) return
    setBusy(true)
    const updated = await run(() => apiRequest(`/listings/${listing.id}/status`, { method: 'PATCH', body: { status } }))
    setBusy(false)
    if (updated) run(() => Promise.all([loadListings(), loadInbox()]))
  }

  async function messageSeller(listingId) {
    const result = await run(() => apiRequest(`/messaging/listings/${listingId}/conversations`, { method: 'POST' }))
    if (!result) return
    await run(loadInbox)
    setActiveId(result.id)
  }

  async function send(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || !activeId) return
    setBusy(true)
    const sent = await run(() => apiRequest(`/messaging/conversations/${activeId}/messages`, {
      method: 'POST', body: { body },
    }))
    setBusy(false)
    if (!sent) return
    setDraft('')
    setMessages(current => [...current, { id: sent.id, body, createdAt: sent.createdAt, fromMe: true }])
    loadInbox().catch(() => {})
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b-2 border-ink">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <a href="#top" aria-label="HUS home"><Wordmark /></a>
          <span className="eyebrow text-cherry">Beta · listings &amp; chat test</span>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        {userId === null && (
          <p>You are signed out. <a className="underline" href="#/signup">Sign in</a>, then come back to <code>#/beta/listings</code>.</p>
        )}
        {error && (
          <p role="alert" className="mb-6 border-2 border-cherry bg-white px-4 py-3 text-cherry">{error}</p>
        )}

        {userId && (
          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="listings-title">
              <h1 id="listings-title" className="font-display text-3xl font-extrabold">Listings</h1>

              <form onSubmit={createListing} className="mt-4 grid gap-3 border-2 border-ink bg-white p-4 sm:grid-cols-[auto_1fr_8rem_auto]">
                <label className="sr-only" htmlFor="beta-category">Category</label>
                <select id="beta-category" className="border-2 border-ink px-2 py-2"
                  value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="sales">Sales</option>
                  <option value="housing">Housing</option>
                  <option value="gigs">Gigs</option>
                </select>
                <label className="sr-only" htmlFor="beta-title">Title</label>
                <input id="beta-title" required maxLength={200} placeholder="Title" className="border-2 border-ink px-3 py-2"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <label className="sr-only" htmlFor="beta-price">Price in yen</label>
                <input id="beta-price" inputMode="numeric" placeholder="¥ (optional)" className="border-2 border-ink px-3 py-2"
                  value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                <button type="submit" className="btn-primary" disabled={busy}>Post</button>
              </form>

              <ul className="mt-6 space-y-4">
                {listings.length === 0 && <li className="text-ink/60">No listings yet. Post one above.</li>}
                {listings.map(listing => (
                  <li key={listing.id} className="border-2 border-ink bg-white p-4 shadow-hard">
                    <p className="eyebrow text-cherry">{listing.category} · {statusLabel[listing.status] ?? listing.status}</p>
                    <p className="mt-1 font-display text-lg font-bold">{listing.title}</p>
                    <p className="font-mono text-xs text-ink/60">
                      {listing.price_jpy == null ? 'Ask for price' : yen.format(listing.price_jpy)}
                      {' · '}{listing.author?.name || 'Hootus member'}
                    </p>
                    {listing.is_mine
                      ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs uppercase tracking-widest text-ink/50">Your listing</span>
                          {listing.status === 'active' && (
                            <>
                              <button type="button" className="btn-primary" disabled={busy}
                                onClick={() => endListing(listing, 'sold')}>
                                {successLabel[listing.category] ?? 'Mark as done'}
                              </button>
                              <button type="button" className="border-2 border-ink px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest"
                                disabled={busy} onClick={() => endListing(listing, 'closed')}>
                                Close without sale
                              </button>
                            </>
                          )}
                        </div>
                      )
                      : (
                        <button type="button" className="btn-primary mt-3" disabled={listing.status !== 'active'}
                          onClick={() => messageSeller(listing.id)}>
                          Message seller
                        </button>
                      )}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="inbox-title">
              <h2 id="inbox-title" className="font-display text-3xl font-extrabold">Inbox</h2>
              <ul className="mt-4 divide-y-2 divide-ink border-2 border-ink bg-white">
                {inbox.length === 0 && <li className="p-4 text-ink/60">No conversations yet.</li>}
                {inbox.map(c => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setActiveId(c.id)}
                      className={`block w-full p-4 text-left ${c.id === activeId ? 'bg-sun' : 'hover:bg-paper'}`}>
                      <span className="block font-bold">{c.otherName} <span className="font-normal text-ink/60">· {c.isSeller ? 'buyer' : 'seller'}</span></span>
                      <span className="block font-mono text-xs text-ink/60">{c.listingTitle}</span>
                      <span className="mt-1 block truncate text-sm">
                        {c.lastMessage ? `${c.lastFromMe ? 'You: ' : ''}${c.lastMessage}` : 'No messages yet'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {activeId && (
                <div className="mt-6 border-2 border-ink bg-white">
                  <div className="border-b-2 border-ink p-4">
                    <p className="font-bold">{conversation?.otherName ?? 'Loading…'}</p>
                    <p className="font-mono text-xs text-ink/60">
                      {conversation?.listingTitle}
                      {conversation && conversation.listingStatus !== 'active' && ` · listing ${statusLabel[conversation.listingStatus] ?? conversation.listingStatus}`}
                    </p>
                  </div>
                  <ol className="max-h-96 space-y-2 overflow-y-auto p-4" aria-live="polite">
                    {messages.length === 0 && <li className="text-ink/60">Say hello.</li>}
                    {messages.map(m => (
                      <li key={m.id} className={`max-w-[85%] px-3 py-2 ${m.fromMe ? 'ml-auto bg-cherry text-paper' : 'bg-paper'}`}>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className="mt-1 font-mono text-[10px] opacity-70">{stamp(m.createdAt)}</p>
                      </li>
                    ))}
                  </ol>
                  <form onSubmit={send} className="flex gap-2 border-t-2 border-ink p-3">
                    <label className="sr-only" htmlFor="beta-message">Message</label>
                    <input id="beta-message" maxLength={2000} placeholder="Write a message" className="min-w-0 flex-1 border-2 border-ink px-3 py-2"
                      value={draft} onChange={e => setDraft(e.target.value)} />
                    <button type="submit" className="btn-primary" disabled={busy || !draft.trim()}>Send</button>
                  </form>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

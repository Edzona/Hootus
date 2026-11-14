import { useEffect, useState } from 'react'
import { Wordmark } from './Logo'
import { apiRequest } from '../lib/api'

const roles = { student: 'Student', club_leader: 'Club leader', admin: 'Admin' }
const statuses = ['active', 'sold', 'closed']
const tabs = [['users', 'Users'], ['listings', 'Listings'], ['feed', 'Feed posts']]
const sources = { users: '/admin/users', listings: '/listings', feed: '/feed' }
const PAGE = 100
const fetchPage = (list, offset, signal) => apiRequest(`${sources[list]}?limit=${PAGE}&offset=${offset}`, { signal })
const formatDate = value => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function Admin() {
  const [state, setState] = useState({ loading: true, error: '', allowed: false })
  const [meId, setMeId] = useState(null)
  const [data, setData] = useState({ users: [], listings: [], feed: [] })
  const [more, setMore] = useState({ users: false, listings: false, feed: false })
  const [tab, setTab] = useState('users')
  const [busy, setBusy] = useState(null)
  const [actionError, setActionError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    setState({ loading: true, error: '', allowed: false })
    apiRequest('/profile/me', { signal })
      .then(async profile => {
        if (profile.role !== 'admin') return setState({ loading: false, error: '', allowed: false })
        setMeId(profile.id)
        const [users, listings, feed] = await Promise.all(tabs.map(([list]) => fetchPage(list, 0, signal)))
        setData({ users, listings, feed })
        setMore({ users: users.length === PAGE, listings: listings.length === PAGE, feed: feed.length === PAGE })
        setState({ loading: false, error: '', allowed: true })
      })
      .catch(err => { if (!signal.aborted) setState({ loading: false, error: err.message, allowed: false }) })
    return () => controller.abort()
  }, [attempt])

  // Changes apply only after the API confirms them.
  async function run(key, request, apply) {
    setBusy(key)
    setActionError('')
    try {
      apply(await request())
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(null)
    }
  }

  // Deleted rows are removed locally, so the loaded count is the next offset.
  function loadMore(list) {
    run(`more:${list}`, () => fetchPage(list, data[list].length), page => {
      setData(current => {
        const seen = new Set(current[list].map(row => row.id))
        return { ...current, [list]: [...current[list], ...page.filter(row => !seen.has(row.id))] }
      })
      setMore(current => ({ ...current, [list]: page.length === PAGE }))
    })
  }

  const replace = (list, item) => setData(current => ({ ...current, [list]: current[list].map(row => row.id === item.id ? item : row) }))
  const remove = (list, id) => setData(current => ({ ...current, [list]: current[list].filter(row => row.id !== id) }))

  function setUserRole(user, role) {
    if (!window.confirm(`Change ${user.full_name || 'this member'} to ${roles[role]}?`)) return
    run(user.id, () => apiRequest(`/admin/users/${user.id}`, { method: 'PATCH', body: { role } }),
      updated => replace('users', updated))
  }

  function setListingStatus(listing, status) {
    run(listing.id, () => apiRequest(`/admin/listings/${listing.id}`, { method: 'PATCH', body: { status } }),
      updated => replace('listings', updated))
  }

  function deleteItem(list, path, item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    run(item.id, () => apiRequest(`${path}/${item.id}`, { method: 'DELETE' }), () => remove(list, item.id))
  }

  function saveFeedPost(post, changes, done) {
    run(post.id, () => apiRequest(`/admin/feed/${post.id}`, { method: 'PATCH', body: changes }),
      updated => { replace('feed', updated); done() })
  }

  return (
    <div className="grain min-h-screen bg-paper">
      <header className="border-b-2 border-ink">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <a href="#top" aria-label="HUS home"><Wordmark /></a>
          <a href="#/profile" className="link-underline font-mono text-xs uppercase tracking-widest">← Back to profile</a>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-20">
        <p className="eyebrow text-cherry">Noticeboard duty</p>
        <h1 className="mt-4 font-display text-6xl font-extrabold tracking-tight md:text-8xl">
          Admin <span className="font-serif font-normal italic text-cherry">desk.</span>
        </h1>

        {state.loading ? <p role="status" className="mt-10 font-mono">Loading admin tools…</p>
          : state.error ? (
            <div role="alert" className="mt-10 border-2 border-ink bg-white p-6 shadow-hard">
              <p>{state.error}</p>
              <button className="mt-4 mr-6 underline" onClick={() => setAttempt(attempt + 1)}>Try again</button>
              <a href="#/signup" className="underline">Go to sign in</a>
            </div>
          ) : !state.allowed ? (
            <div role="alert" className="mt-10 border-2 border-ink bg-white p-6 shadow-hard">
              <p>This page is for HUS admins only.</p>
              <a href="#/dashboard" className="mt-4 inline-block underline">Back to campus</a>
            </div>
          ) : (
            <>
              <div role="tablist" aria-label="Admin sections" className="mt-10 flex flex-wrap gap-3">
                {tabs.map(([id, label]) => (
                  <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                    className={`border-2 border-ink px-4 py-2 font-mono text-xs uppercase tracking-widest ${tab === id ? 'bg-ink text-paper' : 'bg-white shadow-hard'}`}>
                    {label} ({data[id].length}{more[id] ? '+' : ''})
                  </button>
                ))}
              </div>
              {actionError && <p role="alert" className="mt-6 border-2 border-cherry bg-white p-4 text-cherry">{actionError}</p>}
              <section className="mt-6 border-2 border-ink bg-white shadow-hard" aria-live="polite">
                {tab === 'users' && <Rows items={data.users} empty="No members yet." render={user => (
                  <>
                    <div className="min-w-0">
                      <p className="break-words font-display text-xl font-extrabold">{user.full_name || 'Unnamed member'}</p>
                      <p className="font-mono text-xs uppercase text-ink/60">Joined {formatDate(user.created_at)}</p>
                    </div>
                    {user.id === meId ? (
                      <span className="border-2 border-ink bg-sky px-3 py-1 font-mono text-xs uppercase">{roles[user.role]} · You</span>
                    ) : (
                      <label className="font-mono text-xs uppercase">
                        <span className="sr-only">Role for {user.full_name || 'member'}</span>
                        <select value={user.role} disabled={busy === user.id}
                          onChange={event => setUserRole(user, event.target.value)}
                          className="border-2 border-ink bg-sky px-2 py-1">
                          {Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                    )}
                  </>
                )} />}
                {tab === 'listings' && <Rows items={data.listings} empty="No listings to review." render={listing => (
                  <>
                    <div className="min-w-0">
                      <p className="break-words font-display text-xl font-extrabold">{listing.title}</p>
                      <p className="font-mono text-xs uppercase text-ink/60">
                        {listing.category} · {listing.author?.name || 'Member'} · {formatDate(listing.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="font-mono text-xs uppercase">
                        <span className="sr-only">Status for {listing.title}</span>
                        <select value={listing.status} disabled={busy === listing.id}
                          onChange={event => setListingStatus(listing, event.target.value)}
                          className="border-2 border-ink bg-paper px-2 py-1">
                          {statuses.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </label>
                      <DeleteButton busy={busy === listing.id} onClick={() => deleteItem('listings', '/admin/listings', listing)} />
                    </div>
                  </>
                )} />}
                {tab === 'feed' && <Rows items={data.feed} empty="No feed posts to review." render={post => (
                  <FeedRow post={post} busy={busy === post.id}
                    onSave={(changes, done) => saveFeedPost(post, changes, done)}
                    onDelete={() => deleteItem('feed', '/admin/feed', post)} />
                )} />}
                {more[tab] && (
                  <div className="border-t-2 border-ink p-5 text-center">
                    <button onClick={() => loadMore(tab)} disabled={busy === `more:${tab}`}
                      className="border-2 border-ink bg-paper px-4 py-2 font-mono text-xs uppercase tracking-widest disabled:opacity-50">
                      {busy === `more:${tab}` ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
      </main>
    </div>
  )
}

function Rows({ items, empty, render }) {
  if (!items.length) return <p className="p-6 text-ink/60">{empty}</p>
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/20 p-5 last:border-b-0">
          {render(item)}
        </li>
      ))}
    </ul>
  )
}

function DeleteButton({ busy, onClick }) {
  return (
    <button onClick={onClick} disabled={busy}
      className="border-2 border-ink bg-cherry px-3 py-1 font-mono text-xs uppercase text-paper disabled:opacity-50">
      {busy ? 'Working…' : 'Delete'}
    </button>
  )
}

function FeedRow({ post, busy, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(post.title)
  const [body, setBody] = useState(post.body)

  function startEditing() {
    setTitle(post.title)
    setBody(post.body)
    setEditing(true)
  }

  function submit(event) {
    event.preventDefault()
    onSave({ title, body }, () => setEditing(false))
  }

  if (editing) {
    return (
      <form onSubmit={submit} className="w-full space-y-3">
        <label className="block">
          <span className="eyebrow text-ink/60">Title</span>
          <input value={title} onChange={event => setTitle(event.target.value)} required maxLength={200}
            className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2" />
        </label>
        <label className="block">
          <span className="eyebrow text-ink/60">Body</span>
          <textarea value={body} onChange={event => setBody(event.target.value)} maxLength={10000} rows={3}
            className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2" />
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={busy || !title.trim()} className="btn-primary disabled:opacity-50">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" disabled={busy} onClick={() => setEditing(false)} className="underline">Cancel</button>
        </div>
      </form>
    )
  }

  return (
    <>
      <div className="min-w-0">
        <p className="break-words font-display text-xl font-extrabold">{post.title}</p>
        <p className="font-mono text-xs uppercase text-ink/60">
          {post.kind === 'perk' ? 'Perk' : 'Club event'} · {post.author?.name || 'Member'} · {formatDate(post.created_at)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={startEditing} disabled={busy}
          className="border-2 border-ink bg-white px-3 py-1 font-mono text-xs uppercase disabled:opacity-50">Edit</button>
        <DeleteButton busy={busy} onClick={onDelete} />
      </div>
    </>
  )
}

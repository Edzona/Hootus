import { useEffect, useState } from 'react'
import { Wordmark } from './Logo'
import { apiRequest } from '../lib/api'
import { formatShortDate } from '../lib/format'
import { PartnerCategory, partnerCategories } from '../../../backend/src/types/clubOptions'
import { ReportAssignment, ReportStatus } from '../../../backend/src/types/domain'
import ClubDesk from './admin/ClubDesk'
import ReportRow from './moderation/ReportRow'

const roles = { student: 'Student', club_leader: 'Club leader', partner: 'Partner', admin: 'Admin', moderator: 'Moderator' }
const statuses = ['active', 'sold', 'closed']
const tabs = [['members', 'Users'], ['reports', 'Reports'], ['clubRequests', 'Club requests'], ['clubs', 'Clubs'], ['partners', 'Partners'], ['listings', 'Listings'], ['feed', 'Feed posts']]
const sources = { users: '/admin/users', clubRequests: '/admin/club-requests', listings: '/admin/listings', feed: '/feed' }
const PAGE = 100
const fetchPage = (list, offset, signal) => apiRequest(`${sources[list]}?limit=${PAGE}&offset=${offset}`, { signal })

const memberParams = (filter, offset) => {
  const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) })
  if (filter.search.trim()) params.set('search', filter.search.trim())
  if (filter.role) params.set('role', filter.role)
  return params
}
const fetchMembers = (filter, offset, signal) => apiRequest(`/admin/users?${memberParams(filter, offset)}`, { signal })
const fetchReports = (filter, offset, signal) => {
  const params = new URLSearchParams({ status: filter.status, limit: String(PAGE), offset: String(offset) })
  if (filter.assigned !== 'all') params.set('assigned', filter.assigned)
  return apiRequest(`/moderation/reports?${params}`, { signal })
}

export default function Admin() {
  const [state, setState] = useState({ loading: true, error: '', allowed: false })
  const [meId, setMeId] = useState(null)
  const [data, setData] = useState({ users: [], members: [], reports: [], clubRequests: [], listings: [], feed: [] })
  const [more, setMore] = useState({ users: false, members: false, reports: false, clubRequests: false, listings: false, feed: false })
  const [tab, setTab] = useState('members')
  const [memberFilter, setMemberFilter] = useState({ search: '', role: '' })
  const [appliedMemberFilter, setAppliedMemberFilter] = useState({ search: '', role: '' })
  const [reportFilter, setReportFilter] = useState({ status: ReportStatus.Open, assigned: 'all' })
  const [staff, setStaff] = useState([])
  const [busy, setBusy] = useState(null)
  const [actionError, setActionError] = useState('')
  const [partnerNotice, setPartnerNotice] = useState('')
  const [partnerForm, setPartnerForm] = useState({
    email: '', contactName: '', orgName: '', handle: '', category: PartnerCategory.RealEstate, description: '', hours: '', location: '',
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    setState({ loading: true, error: '', allowed: false })
    apiRequest('/profile/me', { signal })
      .then(async profile => {
        if (profile.role !== 'admin') return setState({ loading: false, error: '', allowed: false })
        setMeId(profile.id)
        const [users, reports, clubRequests, listings, feed, moderators, admins] = await Promise.all([
          fetchPage('users', 0, signal), fetchReports({ status: ReportStatus.Open, assigned: 'all' }, 0, signal),
          fetchPage('clubRequests', 0, signal), fetchPage('listings', 0, signal), fetchPage('feed', 0, signal),
          apiRequest('/admin/users?role=moderator&limit=100', { signal }),
          apiRequest('/admin/users?role=admin&limit=100', { signal }),
        ])
        setData({ users, members: users, reports, clubRequests, listings, feed })
        setStaff([...admins, ...moderators])
        setMore({
          users: users.length === PAGE, members: users.length === PAGE, reports: reports.length === PAGE,
          clubRequests: clubRequests.length === PAGE, listings: listings.length === PAGE, feed: feed.length === PAGE,
        })
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

  // Status changes stay in the admin listing; deleted rows leave both lists.
  function loadMore(list) {
    const request = () => list === 'members' ? fetchMembers(appliedMemberFilter, data.members.length)
      : list === 'reports' ? fetchReports(reportFilter, data.reports.length)
      : fetchPage(list, data[list].length)
    run(`more:${list}`, request, page => {
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
      updated => { replace('users', updated); replace('members', updated) })
  }

  function setListingStatus(listing, status) {
    run(listing.id, () => apiRequest(`/admin/listings/${listing.id}`, { method: 'PATCH', body: { status } }),
      updated => replace('listings', updated))
  }

  function deleteItem(list, path, item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    run(item.id, () => apiRequest(`${path}/${item.id}`, { method: 'DELETE' }), () => remove(list, item.id))
  }

  function reviewClubRequest(request, decision) {
    const note = decision === 'rejected' ? window.prompt('Optional reason for rejecting:') ?? '' : ''
    run(request.id, () => apiRequest(`/admin/club-requests/${request.id}`, { method: 'PATCH', body: { decision, ...(note.trim() ? { note: note.trim() } : {}) } }),
      updated => replace('clubRequests', updated))
  }

  function createPartner(event) {
    event.preventDefault()
    setPartnerNotice('')
    run('partner', () => apiRequest('/admin/partners', { method: 'POST', body: partnerForm }), created => {
      setPartnerNotice(`Created partner "${created.org_name}" (${created.email}). They can now sign in via email code.`)
      setPartnerForm({ email: '', contactName: '', orgName: '', handle: '', category: PartnerCategory.RealEstate, description: '', hours: '', location: '' })
      setAttempt(a => a + 1)
    })
  }

  function reloadReports(filter = reportFilter) {
    run('reports', () => fetchReports(filter, 0), page => {
      setData(current => ({ ...current, reports: page }))
      setMore(current => ({ ...current, reports: page.length === PAGE }))
    })
  }

  function loadMembers(filter) {
    run('members', () => fetchMembers(filter, 0), page => {
      setAppliedMemberFilter(filter)
      setData(current => ({ ...current, members: page }))
      setMore(current => ({ ...current, members: page.length === PAGE }))
    })
  }

  function searchMembers(event) {
    event.preventDefault()
    loadMembers(memberFilter)
  }

  function clearMemberFilter() {
    const filter = { search: '', role: '' }
    setMemberFilter(filter)
    loadMembers(filter)
  }

  function changeReportFilter(field, value) {
    const filter = { ...reportFilter, [field]: value }
    setReportFilter(filter)
    reloadReports(filter)
  }

  function assignReport(report, assigneeId) {
    run(report.id, () => apiRequest(`/admin/reports/${report.id}/assignee`, { method: 'PATCH', body: { assigneeId } }), () => reloadReports())
  }

  function updateReportStatus(report, status) {
    run(report.id, () => apiRequest(`/moderation/reports/${report.id}`, { method: 'PATCH', body: { status } }), () => reloadReports())
  }

  function toggleReportTarget(kind, id, hidden) {
    run(id, () => apiRequest(`/moderation/content/${kind}/${id}`, { method: 'PATCH', body: { hidden } }), () => reloadReports())
  }

  function deleteReportTarget(kind, id, title) {
    if (!window.confirm(`Delete "${title || 'this content'}"? This cannot be undone.`)) return
    run(id, () => apiRequest(`/moderation/content/${kind}/${id}`, { method: 'DELETE' }), () => reloadReports())
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
                    {label}{data[id] ? ` (${data[id].length}${more[id] ? '+' : ''})` : ''}
                  </button>
                ))}
              </div>
              {actionError && <p role="alert" className="mt-6 border-2 border-cherry bg-white p-4 text-cherry">{actionError}</p>}
              <section className="mt-6 border-2 border-ink bg-white shadow-hard" aria-live="polite">
                {tab === 'members' && (
                  <>
                    <form onSubmit={searchMembers} className="flex flex-wrap items-end gap-4 border-b border-ink/20 p-5">
                      <label className="block">
                        <span className="eyebrow text-ink/70">Search members by name</span>
                        <input value={memberFilter.search} maxLength={100}
                          onChange={event => setMemberFilter(filter => ({ ...filter, search: event.target.value }))}
                          className="mt-1 border-2 border-ink bg-paper px-3 py-2 text-sm" />
                      </label>
                      <label className="block">
                        <span className="eyebrow text-ink/70">Role</span>
                        <select value={memberFilter.role}
                          onChange={event => setMemberFilter(filter => ({ ...filter, role: event.target.value }))}
                          className="mt-1 border-2 border-ink bg-paper px-3 py-2 text-sm">
                          <option value="">All roles</option>
                          {Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <button type="submit" disabled={busy === 'members'} className="border-2 border-ink bg-ink px-4 py-2 font-mono text-xs uppercase text-paper disabled:opacity-50">Search</button>
                      <button type="button" disabled={busy === 'members'} onClick={clearMemberFilter} className="font-mono text-xs uppercase underline disabled:opacity-50">Clear</button>
                    </form>
                    <Rows items={data.members} empty="No members match this search." render={user => (
                  <>
                    <div className="min-w-0">
                      <p className="break-words font-display text-xl font-extrabold">{user.full_name || 'Unnamed member'}</p>
                      <p className="font-mono text-xs uppercase text-ink/60">Joined {formatShortDate(user.created_at)}</p>
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
                )} />
                  </>
                )}
                {tab === 'reports' && (
                  <>
                    <div className="flex flex-wrap gap-5 border-b border-ink/20 p-5">
                      <label className="inline-flex items-center gap-3 font-mono text-xs uppercase">
                        Status
                        <select value={reportFilter.status} disabled={busy === 'reports'}
                          onChange={event => changeReportFilter('status', event.target.value)}
                          className="border-2 border-ink bg-white px-3 py-2">
                          {Object.values(ReportStatus).map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </label>
                      <label className="inline-flex items-center gap-3 font-mono text-xs uppercase">
                        Assignment
                        <select value={reportFilter.assigned} disabled={busy === 'reports'}
                          onChange={event => changeReportFilter('assigned', event.target.value)}
                          className="border-2 border-ink bg-white px-3 py-2">
                          <option value="all">All</option>
                          <option value={ReportAssignment.Me}>Assigned to me</option>
                          <option value={ReportAssignment.Unassigned}>Unassigned</option>
                        </select>
                      </label>
                    </div>
                    {data.reports.length ? (
                      <ul>
                        {data.reports.map(report => (
                          <ReportRow key={report.id} report={report} busy={busy}
                            onStatus={updateReportStatus} onToggleHidden={toggleReportTarget} onDelete={deleteReportTarget}
                            assign={{ staff, onAssign: assignReport }} />
                        ))}
                      </ul>
                    ) : <p className="p-6 text-ink/60">No reports match this filter.</p>}
                  </>
                )}
                {tab === 'clubRequests' && <Rows items={data.clubRequests} empty="No club requests to review." render={req => (
                  <>
                    <div className="min-w-0 max-w-xl">
                      <p className="break-words font-display text-xl font-extrabold">{req.name} <span className="font-mono text-sm font-normal text-ink/60">@{req.handle}</span></p>
                      <p className="font-mono text-xs uppercase text-ink/60">
                        {req.category} · by {req.requester_name || 'Student'} · {req.status}
                      </p>
                      <p className="mt-2 text-sm text-ink/80">{req.description}</p>
                      {req.verification_note && <p className="mt-1 font-mono text-xs text-ink/65">Verification: {req.verification_note}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {req.status === 'pending' ? (
                        <>
                          <button type="button" disabled={busy === req.id} onClick={() => reviewClubRequest(req, 'approved')}
                            className="border-2 border-ink bg-matcha px-3 py-1 font-mono text-xs font-bold uppercase disabled:opacity-50">
                            Approve
                          </button>
                          <button type="button" disabled={busy === req.id} onClick={() => reviewClubRequest(req, 'rejected')}
                            className="border-2 border-ink bg-cherry px-3 py-1 font-mono text-xs font-bold uppercase text-paper disabled:opacity-50">
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="border-2 border-ink bg-paper px-3 py-1 font-mono text-xs uppercase">{req.status}</span>
                      )}
                    </div>
                  </>
                )} />}
                {tab === 'clubs' && <ClubDesk users={data.users} moreUsers={more.users} loadingUsers={busy === 'more:users'} onLoadMoreUsers={() => loadMore('users')} />}
                {tab === 'partners' && (
                  <form onSubmit={createPartner} className="space-y-4 p-6">
                    <h2 className="font-display text-2xl font-extrabold">Create third-party partner account</h2>
                    <p className="text-sm text-ink/70">Onboard external partners (real estate agents, local businesses) using any email address. They can sign in via email code, manage their partner page, create listings, post updates, and publish promotional offers.</p>
                    {partnerNotice && <p role="status" className="border-2 border-ink bg-matcha/40 p-3 font-mono text-xs">{partnerNotice}</p>}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="eyebrow text-ink/70">Partner email (any domain)</span>
                        <input required type="email" value={partnerForm.email} onChange={e => setPartnerForm(f => ({ ...f, email: e.target.value }))} placeholder="agent@sangenjaya-realty.jp" className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 font-mono text-sm" />
                      </label>
                      <label className="block">
                        <span className="eyebrow text-ink/70">Contact name</span>
                        <input required maxLength={150} value={partnerForm.contactName} onChange={e => setPartnerForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Kenji Sato" className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 text-sm" />
                      </label>
                      <label className="block">
                        <span className="eyebrow text-ink/70">Organization name</span>
                        <input required minLength={2} maxLength={100} value={partnerForm.orgName} onChange={e => setPartnerForm(f => ({ ...f, orgName: e.target.value }))} placeholder="Sancha Housing Partners" className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 text-sm" />
                      </label>
                      <label className="block">
                        <span className="eyebrow text-ink/70">Handle</span>
                        <input required minLength={2} maxLength={40} pattern="[a-zA-Z0-9_]+" value={partnerForm.handle} onChange={e => setPartnerForm(f => ({ ...f, handle: e.target.value }))} placeholder="sanchahousing" className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 font-mono text-sm" />
                      </label>
                      <label className="block">
                        <span className="eyebrow text-ink/70">Category</span>
                        <select value={partnerForm.category} onChange={e => setPartnerForm(f => ({ ...f, category: e.target.value }))} className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 text-sm">
                          {partnerCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="eyebrow text-ink/70">Hours / Contact</span>
                        <input maxLength={120} value={partnerForm.hours} onChange={e => setPartnerForm(f => ({ ...f, hours: e.target.value }))} placeholder="Mon–Sat 10:00–18:00" className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 text-sm" />
                      </label>
                    </div>
                    <label className="block">
                      <span className="eyebrow text-ink/70">Location</span>
                      <input maxLength={120} value={partnerForm.location} onChange={e => setPartnerForm(f => ({ ...f, location: e.target.value }))} placeholder="Sangenjaya Station North Exit" className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 text-sm" />
                    </label>
                    <label className="block">
                      <span className="eyebrow text-ink/70">Description</span>
                      <textarea required minLength={10} maxLength={1000} rows={3} value={partnerForm.description} onChange={e => setPartnerForm(f => ({ ...f, description: e.target.value }))} placeholder="English-friendly apartment & sharehouse support for TUJ students." className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 text-sm" />
                    </label>
                    <button type="submit" disabled={busy === 'partner'} className="btn-primary">
                      {busy === 'partner' ? 'Creating…' : 'Create partner account →'}
                    </button>
                  </form>
                )}
                {tab === 'listings' && <Rows items={data.listings} empty="No listings to review." render={listing => (
                  <>
                    <div className="min-w-0">
                      <p className="break-words font-display text-xl font-extrabold">{listing.title}</p>
                      <p className="font-mono text-xs uppercase text-ink/60">
                        {listing.category} · {listing.author?.name || 'Member'} · {formatShortDate(listing.created_at)}
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
          {post.kind === 'perk' ? 'Perk' : 'Club event'} · {post.author?.name || 'Member'} · {formatShortDate(post.created_at)}
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

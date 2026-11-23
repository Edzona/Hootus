import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../lib/api'
import { ClubCategory, ClubColor, MemberRole, ReviewStatus, clubCategories } from '../../../../backend/src/types/clubOptions'

const PAGE = 50
const emptyClub = {
  name: '',
  handle: '',
  category: ClubCategory.ArtsCulture,
  description: '',
  meeting: '',
  location: '',
  founderId: '',
}

export default function ClubDesk({ users, moreUsers, onLoadMoreUsers, loadingUsers }) {
  const [clubs, setClubs] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [members, setMembers] = useState([])
  const [form, setForm] = useState(emptyClub)
  const [editForm, setEditForm] = useState(null)
  const [transferId, setTransferId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const selected = clubs.find(club => club.id === selectedId) || null
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId
  const selectedOrgType = selected?.org_type
  const approvedMembers = members.filter(member => member.status === ReviewStatus.Approved && !member.is_founder)

  const loadClubs = useCallback(async (offset = 0) => {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)
    setError('')
    try {
      const page = await apiRequest(`/admin/clubs?limit=${PAGE}&offset=${offset}`)
      setClubs(current => {
        if (offset === 0) return page
        const seen = new Set(current.map(club => club.id))
        return [...current, ...page.filter(club => !seen.has(club.id))]
      })
      setHasMore(page.length === PAGE)
      if (offset === 0 && page.length) setSelectedId(current => current || page[0].id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  async function refreshClub(id) {
    if (selectedIdRef.current === id) setMembersLoading(true)
    try {
      const [club, rows] = await Promise.all([
        apiRequest(`/admin/clubs/${id}`),
        apiRequest(`/campus/clubs/${id}/members`),
      ])
      setClubs(current => current.map(item => item.id === id ? club : item))
      if (selectedIdRef.current === id) setMembers(rows)
    } finally {
      if (selectedIdRef.current === id) setMembersLoading(false)
    }
  }

  useEffect(() => { loadClubs() }, [attempt, loadClubs])

  useEffect(() => {
    setEditForm(selected ? {
      name: selected.name,
      category: selected.category,
      description: selected.description,
      meeting: selected.meeting,
      location: selected.location,
      mark: selected.mark,
      color: selected.color,
    } : null)
    setTransferId('')
  }, [selected])

  useEffect(() => {
    if (!selectedId || selectedOrgType !== 'club') {
      setMembers([])
      setMembersLoading(false)
      return
    }
    let active = true
    setMembersLoading(true)
    apiRequest(`/campus/clubs/${selectedId}/members`)
      .then(rows => { if (active) setMembers(rows) })
      .catch(err => { if (active) setError(err.message) })
      .finally(() => { if (active) setMembersLoading(false) })
    return () => { active = false }
  }, [selectedId, selectedOrgType, attempt])

  async function createClub(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await apiRequest('/admin/clubs', {
        method: 'POST',
        body: { ...form, name: form.name.trim(), handle: form.handle.trim(), description: form.description.trim(), meeting: form.meeting.trim(), location: form.location.trim() },
      })
      setForm(emptyClub)
      setShowCreate(false)
      setNotice('Club created.')
      await loadClubs()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveClub(event) {
    event.preventDefault()
    if (!selected || !editForm) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await apiRequest(`/campus/clubs/${selected.id}`, {
        method: 'PATCH',
        body: {
          ...editForm,
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          meeting: editForm.meeting.trim(),
          location: editForm.location.trim(),
        },
      })
      setClubs(current => current.map(club => club.id === selected.id ? { ...club, ...updated } : club))
      setNotice('Club details saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function updateMember(member, changes, message) {
    if (!selected) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/campus/clubs/${selected.id}/members/${member.id}`, { method: 'PATCH', body: changes })
      await refreshClub(selected.id)
      setNotice(message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function removeMember(member) {
    if (!selected || !window.confirm(`Remove ${member.name || 'this member'} from ${selected.name}?`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/campus/clubs/${selected.id}/members/${member.id}`, { method: 'DELETE' })
      await refreshClub(selected.id)
      setNotice('Member removed.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function transferFounder(event) {
    event.preventDefault()
    if (!selected || !transferId) return
    const member = approvedMembers.find(item => item.id === transferId)
    if (!window.confirm(`Make ${member?.name || 'this member'} the founder of ${selected.name}?`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/admin/clubs/${selected.id}/founder`, {
        method: 'PATCH',
        body: { memberId: transferId },
      })
      await refreshClub(selected.id)
      setTransferId('')
      setNotice('Club founder transferred.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteClub() {
    if (!selected || !window.confirm(`Delete "${selected.name}" and its club activity? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/admin/clubs/${selected.id}`, { method: 'DELETE' })
      const remaining = clubs.filter(club => club.id !== selected.id)
      setClubs(remaining)
      setSelectedId(remaining[0]?.id || '')
      setNotice('Club deleted.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Club desk</h2>
          <p className="mt-1 text-sm text-ink/65">Manage clubs, founders, and memberships.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(open => !open)} className="btn-primary">
          {showCreate ? 'Close form' : '＋ New club'}
        </button>
      </div>
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-2 border-cherry bg-white p-3 text-cherry">
          <span>{error}</span>
          <button type="button" onClick={() => setAttempt(value => value + 1)} className="font-mono text-xs underline">Reload clubs and members</button>
        </div>
      )}
      {notice && <p role="status" className="border-2 border-ink bg-matcha/40 p-3 font-mono text-xs">{notice}</p>}

      {showCreate && (
        <form onSubmit={createClub} className="space-y-4 border-2 border-ink bg-paper p-5">
          <h3 className="font-display text-xl font-extrabold">Create a club</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="eyebrow text-ink/70">Name</span>
              <input required minLength={2} maxLength={100} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="mt-1 w-full border-2 border-ink bg-white px-3 py-2" />
            </label>
            <label className="block">
              <span className="eyebrow text-ink/70">Handle</span>
              <input required minLength={2} maxLength={40} pattern="[a-zA-Z0-9_]+" value={form.handle} onChange={event => setForm(current => ({ ...current, handle: event.target.value }))} className="mt-1 w-full border-2 border-ink bg-white px-3 py-2 font-mono" />
            </label>
            <label className="block">
              <span className="eyebrow text-ink/70">Category</span>
              <select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} className="mt-1 w-full border-2 border-ink bg-white px-3 py-2">
                {clubCategories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="eyebrow text-ink/70">Founder</span>
              <select required value={form.founderId} onChange={event => setForm(current => ({ ...current, founderId: event.target.value }))} className="mt-1 w-full border-2 border-ink bg-white px-3 py-2">
                <option value="">Choose a member</option>
                {users.map(user => <option key={user.id} value={user.id}>{user.full_name || 'Unnamed member'}</option>)}
              </select>
              {moreUsers && <button type="button" disabled={loadingUsers} onClick={onLoadMoreUsers} className="mt-2 font-mono text-xs underline disabled:opacity-50">{loadingUsers ? 'Loading members…' : 'Load more members'}</button>}
            </label>
          </div>
          <label className="block">
            <span className="eyebrow text-ink/70">Description</span>
            <textarea required minLength={10} maxLength={1000} rows={3} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} className="mt-1 w-full border-2 border-ink bg-white px-3 py-2" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="eyebrow text-ink/70">Meeting</span>
              <input maxLength={120} value={form.meeting} onChange={event => setForm(current => ({ ...current, meeting: event.target.value }))} className="mt-1 w-full border-2 border-ink bg-white px-3 py-2" />
            </label>
            <label className="block">
              <span className="eyebrow text-ink/70">Location</span>
              <input maxLength={120} value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} className="mt-1 w-full border-2 border-ink bg-white px-3 py-2" />
            </label>
          </div>
          <button type="submit" disabled={busy || !users.length} className="btn-primary disabled:opacity-50">{busy ? 'Creating…' : 'Create club →'}</button>
        </form>
      )}

      {loading ? <p role="status" className="font-mono text-sm text-ink/60">Loading clubs…</p> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,1.1fr)]">
          <div>
            {clubs.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {clubs.map(club => (
                  <button type="button" key={club.id} onClick={() => setSelectedId(club.id)} aria-pressed={selectedId === club.id}
                    className={`border-2 border-ink p-4 text-left shadow-hard ${selectedId === club.id ? 'bg-sun/50' : 'bg-white'}`}>
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block break-words font-display text-lg font-extrabold">{club.name}</span>
                        <span className="mt-1 block font-mono text-xs text-ink/60">@{club.handle} · {club.category}</span>
                      </span>
                      {club.pending > 0 && <span className="shrink-0 border border-ink bg-sun px-2 py-1 font-mono text-[10px] uppercase">{club.pending} pending</span>}
                    </span>
                    <span className="mt-4 block text-sm">Founder: {club.founder?.name || 'Unassigned'}</span>
                    <span className="mt-1 block font-mono text-xs text-ink/60">{club.members} members · {club.org_type}</span>
                  </button>
                ))}
              </div>
            ) : <p className="border-2 border-ink bg-paper p-5 text-ink/60">No clubs or partner pages yet.</p>}
            {hasMore && <button type="button" disabled={loadingMore} onClick={() => loadClubs(clubs.length)} className="mt-4 w-full border-2 border-ink bg-paper px-4 py-2 font-mono text-xs uppercase tracking-widest disabled:opacity-50">{loadingMore ? 'Loading…' : 'Load more clubs'}</button>}
          </div>

          {selected && (
            <section className="min-w-0 border-2 border-ink bg-white p-5 shadow-hard">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-cherry">{selected.org_type === 'club' ? 'Club details' : 'Partner page'}</p>
                  <h3 className="mt-1 break-words font-display text-2xl font-extrabold">{selected.name}</h3>
                  <p className="font-mono text-xs text-ink/60">@{selected.handle} · Created {new Date(selected.created_at).toLocaleDateString()}</p>
                </div>
                {selected.org_type === 'club' && <button type="button" disabled={busy} onClick={deleteClub} className="border-2 border-ink bg-cherry px-3 py-1 font-mono text-xs uppercase text-white disabled:opacity-50">Delete club</button>}
              </div>

              {selected.org_type !== 'club' ? <p className="mt-5 border-t border-ink/20 pt-4 text-sm text-ink/65">Partner pages are listed here but cannot be deleted from the club desk.</p> : (
                <>
                  <form onSubmit={saveClub} className="mt-5 space-y-3 border-t border-ink/20 pt-4">
                    <h4 className="font-mono text-xs font-bold uppercase tracking-widest">Edit details</h4>
                    <label className="block text-xs">
                      Name
                      <input required minLength={2} maxLength={100} value={editForm?.name || ''} onChange={event => setEditForm(current => ({ ...current, name: event.target.value }))} className="mt-1 w-full border border-ink bg-paper px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-xs">
                      Category
                      <select value={editForm?.category || ClubCategory.ArtsCulture} onChange={event => setEditForm(current => ({ ...current, category: event.target.value }))} className="mt-1 w-full border border-ink bg-paper px-3 py-2 text-sm">
                        {clubCategories.map(category => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs">
                      Description
                      <textarea required minLength={10} maxLength={1000} rows={3} value={editForm?.description || ''} onChange={event => setEditForm(current => ({ ...current, description: event.target.value }))} className="mt-1 w-full border border-ink bg-paper px-3 py-2 text-sm" />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs">
                        Meeting
                        <input maxLength={120} value={editForm?.meeting || ''} onChange={event => setEditForm(current => ({ ...current, meeting: event.target.value }))} className="mt-1 w-full border border-ink bg-paper px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-xs">
                        Location
                        <input maxLength={120} value={editForm?.location || ''} onChange={event => setEditForm(current => ({ ...current, location: event.target.value }))} className="mt-1 w-full border border-ink bg-paper px-3 py-2 text-sm" />
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs">
                        Mark
                        <input required maxLength={4} value={editForm?.mark || ''} onChange={event => setEditForm(current => ({ ...current, mark: event.target.value }))} className="mt-1 w-full border border-ink bg-paper px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-xs">
                        Color
                        <select value={editForm?.color || ClubColor.Plum} onChange={event => setEditForm(current => ({ ...current, color: event.target.value }))} className="mt-1 w-full border border-ink bg-paper px-3 py-2 text-sm">
                          {Object.values(ClubColor).map(color => <option key={color} value={color}>{color}</option>)}
                        </select>
                      </label>
                    </div>
                    <button type="submit" disabled={busy} className="border-2 border-ink bg-sun px-4 py-2 font-mono text-xs font-bold uppercase disabled:opacity-50">{busy ? 'Saving…' : 'Save details'}</button>
                  </form>

                  <form onSubmit={transferFounder} className="mt-5 space-y-2 border-t border-ink/20 pt-4">
                    <h4 className="font-mono text-xs font-bold uppercase tracking-widest">Transfer founder</h4>
                    <div className="flex flex-wrap gap-2">
                      <select value={transferId} onChange={event => setTransferId(event.target.value)} className="min-w-0 flex-1 border border-ink bg-paper px-3 py-2 text-sm">
                        <option value="">Choose an approved member</option>
                        {approvedMembers.map(member => <option key={member.id} value={member.id}>{member.name || 'Member'}</option>)}
                      </select>
                      <button type="submit" disabled={busy || !transferId} className="border-2 border-ink bg-matcha px-3 py-2 font-mono text-xs uppercase disabled:opacity-50">Transfer</button>
                    </div>
                  </form>

                  <div className="mt-5 border-t border-ink/20 pt-4">
                    <h4 className="font-mono text-xs font-bold uppercase tracking-widest">Members</h4>
                    {membersLoading ? <p role="status" className="mt-3 text-sm text-ink/60">Loading members…</p> : members.length ? (
                      <ul className="mt-3 divide-y divide-ink/15">
                        {members.map(member => (
                          <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-bold">{member.name || 'Member'}{member.is_founder && <span className="ml-2 border border-ink bg-sun px-1.5 py-0.5 font-mono text-[9px] uppercase">Founder</span>}</p>
                              <p className="font-mono text-[10px] uppercase text-ink/60">{member.status} · {member.role}</p>
                            </div>
                            {member.is_founder ? <span className="font-mono text-[10px] text-ink/55">Protected founder</span> : (
                              <div className="flex flex-wrap gap-2">
                                {member.status === ReviewStatus.Pending ? (
                                  <>
                                    <button type="button" disabled={busy} onClick={() => updateMember(member, { status: ReviewStatus.Approved }, 'Member approved.')} className="border border-ink bg-matcha px-2 py-1 font-mono text-[10px] uppercase disabled:opacity-50">Approve</button>
                                    <button type="button" disabled={busy} onClick={() => updateMember(member, { status: ReviewStatus.Rejected }, 'Request rejected.')} className="border border-ink bg-paper px-2 py-1 font-mono text-[10px] uppercase disabled:opacity-50">Reject</button>
                                  </>
                                ) : (
                                  <>
                                    <button type="button" disabled={busy} onClick={() => updateMember(member, { role: member.role === MemberRole.Manager ? MemberRole.Member : MemberRole.Manager }, member.role === MemberRole.Manager ? 'Member role updated.' : 'Member promoted to manager.')} className="border border-ink bg-paper px-2 py-1 font-mono text-[10px] uppercase disabled:opacity-50">{member.role === MemberRole.Manager ? 'Make member' : 'Make manager'}</button>
                                    <button type="button" disabled={busy} onClick={() => removeMember(member)} className="border border-ink bg-cherry px-2 py-1 font-mono text-[10px] uppercase text-white disabled:opacity-50">Remove</button>
                                  </>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-3 text-sm text-ink/60">No club members yet.</p>}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

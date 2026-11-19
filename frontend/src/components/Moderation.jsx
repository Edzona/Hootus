import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import { ModerationTarget, ReportStatus } from '../../../backend/src/types/domain'

const PAGE = 50
const tabs = [
  ['reports', 'Reports'],
  [ModerationTarget.Listing, 'Listings'],
  [ModerationTarget.FeedPost, 'Feed posts'],
  [ModerationTarget.ClubPost, 'Club posts'],
]

export default function Moderation() {
  const [access, setAccess] = useState({ loading: true, allowed: false, error: '' })
  const [tab, setTab] = useState('reports')
  const [reportStatus, setReportStatus] = useState(ReportStatus.Open)
  const [hiddenFilter, setHiddenFilter] = useState('all')
  const [reports, setReports] = useState([])
  const [content, setContent] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const contentKind = tab === 'reports' ? null : tab

  useEffect(() => {
    const controller = new AbortController()
    setAccess({ loading: true, allowed: false, error: '' })
    apiRequest('/profile/me', { signal: controller.signal })
      .then(profile => {
        if (controller.signal.aborted) return
        setAccess({
          loading: false,
          allowed: ['admin', 'moderator'].includes(profile.role),
          error: '',
        })
      })
      .catch(err => {
        if (!controller.signal.aborted) setAccess({ loading: false, allowed: false, error: err.message })
      })
    return () => controller.abort()
  }, [attempt])

  const loadReports = useCallback(async (offset = 0) => {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)
    setError('')
    try {
      const page = await apiRequest(`/moderation/reports?status=${reportStatus}&limit=${PAGE}&offset=${offset}`)
      setReports(current => offset === 0 ? page : [...current, ...page.filter(row => !current.some(item => item.id === row.id))])
      setHasMore(page.length === PAGE)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [reportStatus])

  const loadContent = useCallback(async (offset = 0) => {
    if (!contentKind) return
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)
    setError('')
    const hidden = hiddenFilter === 'all' ? '' : `&hidden=${hiddenFilter === 'hidden'}`
    try {
      const page = await apiRequest(`/moderation/content?kind=${contentKind}&limit=${PAGE}&offset=${offset}${hidden}`)
      setContent(current => offset === 0 ? page : [...current, ...page.filter(row => !current.some(item => item.id === row.id))])
      setHasMore(page.length === PAGE)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [contentKind, hiddenFilter])

  useEffect(() => {
    if (!access.allowed) return
    if (tab === 'reports') loadReports()
    else loadContent()
  }, [access.allowed, tab, reportStatus, hiddenFilter, loadReports, loadContent])

  async function updateReport(report, status) {
    setBusy(report.id)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/moderation/reports/${report.id}`, { method: 'PATCH', body: { status } })
      setNotice(status === ReportStatus.Resolved ? 'Report resolved.' : 'Report dismissed.')
      await loadReports()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function updateTarget(kind, id, hidden) {
    setBusy(id)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/moderation/content/${kind}/${id}`, { method: 'PATCH', body: { hidden } })
      setNotice(hidden ? 'Content hidden.' : 'Content restored.')
      await Promise.all([...(tab === 'reports' ? [loadReports()] : []), ...(contentKind ? [loadContent()] : [])])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function deleteTarget(kind, id, title) {
    if (!window.confirm(`Delete "${title || 'this content'}"? This cannot be undone.`)) return
    setBusy(id)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/moderation/content/${kind}/${id}`, { method: 'DELETE' })
      setNotice('Content deleted.')
      await Promise.all([...(tab === 'reports' ? [loadReports()] : []), ...(contentKind ? [loadContent()] : [])])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="grain min-h-screen bg-paper">
      <header className="border-b-2 border-ink">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <a href="#top" aria-label="HUS home" className="font-display text-xl font-extrabold">HUS</a>
          <a href="#/profile" className="link-underline font-mono text-xs uppercase tracking-widest">← Back to profile</a>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <p className="eyebrow text-cherry">Content care</p>
        <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tight md:text-7xl">
          Moderation <span className="font-serif font-normal italic text-cherry">desk.</span>
        </h1>

        {access.loading ? <p role="status" className="mt-8 font-mono">Loading moderation tools…</p>
          : access.error ? (
            <div role="alert" className="mt-8 border-2 border-ink bg-white p-5 shadow-hard">
              <p>{access.error}</p>
              <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-3 underline">Try again</button>
            </div>
          ) : !access.allowed ? (
            <div role="alert" className="mt-8 border-2 border-ink bg-white p-6 shadow-hard">
              <p>This page is available to moderators and admins.</p>
              <a href="#/dashboard" className="mt-3 inline-block underline">Back to campus</a>
            </div>
          ) : (
            <>
              <div role="tablist" aria-label="Moderation sections" className="mt-8 flex flex-wrap gap-3">
                {tabs.map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                    className={`border-2 border-ink px-4 py-2 font-mono text-xs uppercase tracking-widest ${tab === id ? 'bg-ink text-paper' : 'bg-white shadow-hard'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {tab === 'reports' ? (
                <label className="mt-5 inline-flex items-center gap-3 font-mono text-xs uppercase">
                  Report status
                  <select value={reportStatus} onChange={event => setReportStatus(event.target.value)} className="border-2 border-ink bg-white px-3 py-2">
                    {Object.values(ReportStatus).map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              ) : (
                <label className="mt-5 inline-flex items-center gap-3 font-mono text-xs uppercase">
                  Visibility
                  <select value={hiddenFilter} onChange={event => setHiddenFilter(event.target.value)} className="border-2 border-ink bg-white px-3 py-2">
                    <option value="all">All content</option>
                    <option value="false">Visible</option>
                    <option value="true">Hidden</option>
                  </select>
                </label>
              )}

              {error && <p role="alert" className="mt-5 border-2 border-cherry bg-white p-4 text-cherry">{error}</p>}
              {notice && <p role="status" className="mt-5 border-2 border-ink bg-matcha/40 p-4 font-mono text-xs">{notice}</p>}

              <section className="mt-5 border-2 border-ink bg-white shadow-hard">
                {loading ? <p role="status" className="p-6 font-mono text-sm text-ink/60">Loading content…</p> : tab === 'reports' ? (
                  reports.length ? (
                    <ul>
                      {reports.map(report => {
                        const deleted = report.target_hidden === null
                        const title = report.target_title || 'Content deleted'
                        return (
                          <li key={report.id} className="border-b border-ink/20 p-5 last:border-b-0">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/55">{report.kind.replace('_', ' ')} · {report.status} · {report.target_hidden === true ? 'Hidden' : report.target_hidden === false ? 'Visible' : 'Deleted'}</p>
                                <h2 className="mt-1 break-words font-display text-xl font-extrabold">{title}</h2>
                                <p className="mt-1 font-mono text-xs text-ink/60">by {report.target_author?.name || 'Unknown member'} · {new Date(report.created_at).toLocaleString()}</p>
                                <p className="mt-3 whitespace-pre-wrap text-sm">{report.reason}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {report.status === ReportStatus.Open && (
                                  <>
                                    <button type="button" disabled={busy === report.id} onClick={() => updateReport(report, ReportStatus.Resolved)} className="border-2 border-ink bg-matcha px-3 py-1 font-mono text-[10px] uppercase disabled:opacity-50">Resolve</button>
                                    <button type="button" disabled={busy === report.id} onClick={() => updateReport(report, ReportStatus.Dismissed)} className="border-2 border-ink bg-paper px-3 py-1 font-mono text-[10px] uppercase disabled:opacity-50">Dismiss</button>
                                  </>
                                )}
                                {!deleted && (
                                  <>
                                    <button type="button" disabled={busy === report.target_id} onClick={() => updateTarget(report.kind, report.target_id, !report.target_hidden)} className="border-2 border-ink bg-sun px-3 py-1 font-mono text-[10px] uppercase disabled:opacity-50">{report.target_hidden ? 'Unhide' : 'Hide'}</button>
                                    <button type="button" disabled={busy === report.target_id} onClick={() => deleteTarget(report.kind, report.target_id, title)} className="border-2 border-ink bg-cherry px-3 py-1 font-mono text-[10px] uppercase text-white disabled:opacity-50">Delete</button>
                                  </>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : <p className="p-6 text-ink/60">No reports match this status.</p>
                ) : (
                  content.length ? (
                    <ul>
                      {content.map(item => {
                        const title = item.title || item.club?.name || 'Club post'
                        return (
                          <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/20 p-5 last:border-b-0">
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/55">{item.kind.replace('_', ' ')} · {item.hidden ? 'Hidden' : 'Visible'} · {item.open_reports} open reports</p>
                              <h2 className="mt-1 break-words font-display text-xl font-extrabold">{title}</h2>
                              <p className="mt-1 font-mono text-xs text-ink/60">by {item.author?.name || 'Unknown member'}{item.club?.name ? ` · ${item.club.name}` : ''} · {new Date(item.created_at).toLocaleString()}</p>
                              {item.body && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{item.body}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" disabled={busy === item.id} onClick={() => updateTarget(item.kind, item.id, !item.hidden)} className="border-2 border-ink bg-sun px-3 py-1 font-mono text-[10px] uppercase disabled:opacity-50">{item.hidden ? 'Unhide' : 'Hide'}</button>
                              <button type="button" disabled={busy === item.id} onClick={() => deleteTarget(item.kind, item.id, title)} className="border-2 border-ink bg-cherry px-3 py-1 font-mono text-[10px] uppercase text-white disabled:opacity-50">Delete</button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : <p className="p-6 text-ink/60">No content matches this filter.</p>
                )}
                {hasMore && !loading && (
                  <div className="border-t-2 border-ink p-5 text-center">
                    <button type="button" onClick={() => tab === 'reports' ? loadReports(reports.length) : loadContent(content.length)} disabled={loadingMore} className="border-2 border-ink bg-paper px-4 py-2 font-mono text-xs uppercase tracking-widest disabled:opacity-50">
                      {loadingMore ? 'Loading…' : 'Load more'}
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

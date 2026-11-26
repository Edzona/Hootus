import { ReportStatus } from '../../../../backend/src/types/domain'

export default function ReportRow({ report, busy, onStatus, onToggleHidden, onDelete, assign }) {
  const deleted = report.target_hidden === null
  const title = report.target_title || 'Content deleted'
  return (
    <li className="border-b border-ink/20 p-5 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/55">{report.kind.replace('_', ' ')} · {report.status} · {report.target_hidden === true ? 'Hidden' : report.target_hidden === false ? 'Visible' : 'Deleted'}</p>
          <h2 className="mt-1 break-words font-display text-xl font-extrabold">{title}</h2>
          <p className="mt-1 font-mono text-xs text-ink/60">by {report.target_author?.name || 'Unknown member'} · {new Date(report.created_at).toLocaleString()}</p>
          <p className="mt-1 font-mono text-xs text-ink/60">{report.assignee ? `Assigned to ${report.assignee.name}` : 'Unassigned'}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm">{report.reason}</p>
          {assign && report.status === ReportStatus.Open && (
            <label className="mt-3 inline-flex items-center gap-3 font-mono text-xs uppercase">
              Assign to
              <select value={report.assignee?.id ?? ''} disabled={busy === report.id}
                onChange={event => assign.onAssign(report, event.target.value || null)}
                className="border-2 border-ink bg-white px-3 py-2">
                <option value="">Unassigned</option>
                {assign.staff.map(member => <option key={member.id} value={member.id}>{member.full_name || 'Unnamed member'}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {report.status === ReportStatus.Open && (
            <>
              <button type="button" disabled={busy === report.id} onClick={() => onStatus(report, ReportStatus.Resolved)} className="border-2 border-ink bg-matcha px-3 py-1 font-mono text-[10px] uppercase disabled:opacity-50">Resolve</button>
              <button type="button" disabled={busy === report.id} onClick={() => onStatus(report, ReportStatus.Dismissed)} className="border-2 border-ink bg-paper px-3 py-1 font-mono text-[10px] uppercase disabled:opacity-50">Dismiss</button>
            </>
          )}
          {!deleted && (
            <>
              <button type="button" disabled={busy === report.target_id} onClick={() => onToggleHidden(report.kind, report.target_id, !report.target_hidden)} className="border-2 border-ink bg-sun px-3 py-1 font-mono text-[10px] uppercase disabled:opacity-50">{report.target_hidden ? 'Unhide' : 'Hide'}</button>
              <button type="button" disabled={busy === report.target_id} onClick={() => onDelete(report.kind, report.target_id, title)} className="border-2 border-ink bg-cherry px-3 py-1 font-mono text-[10px] uppercase text-white disabled:opacity-50">Delete</button>
            </>
          )}
        </div>
      </div>
    </li>
  )
}

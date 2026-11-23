import { useState } from 'react'
import { apiRequest } from '../lib/api'

export default function ReportButton({ kind, id, onNotice, className = 'underline' }) {
  const [busy, setBusy] = useState(false)

  async function report() {
    const reason = window.prompt('Why are you reporting this content?')
    if (reason === null) return
    if (!reason.trim()) {
      onNotice('Please enter a reason for your report.')
      return
    }
    if (reason.trim().length > 500) {
      onNotice('Report reasons must be 500 characters or fewer.')
      return
    }
    setBusy(true)
    try {
      await apiRequest('/reports', { method: 'POST', body: { kind, id, reason: reason.trim() } })
      onNotice('Report submitted. Thank you.')
    } catch (error) {
      onNotice(error.status === 409 ? 'You have already reported this content.' : error.message)
    } finally {
      setBusy(false)
    }
  }

  return <button type="button" disabled={busy} onClick={report} className={className}>{busy ? 'Reporting…' : 'Report'}</button>
}

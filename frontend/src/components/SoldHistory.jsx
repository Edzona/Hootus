import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'

const doneLabel = { sales: 'Sold', housing: 'Rented', gigs: 'Filled' }
const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })

export default function SoldHistory() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    apiRequest('/listings/mine/sold?limit=50', { signal: controller.signal })
      .then(next => { if (!controller.signal.aborted) setItems(next) })
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [])

  return (
    <section className="border-2 border-ink bg-white p-6 shadow-hard md:col-span-2 md:p-8" aria-labelledby="sold-history-title">
      <p className="eyebrow">03 / Completed listings</p>
      <h2 id="sold-history-title" className="mt-3 font-display text-2xl font-extrabold">Passed it on</h2>
      {error ? <p role="alert" className="mt-4 text-cherry">{error}</p>
        : items === null ? <p role="status" className="mt-4 font-mono text-sm">Loading…</p>
        : items.length === 0 ? <p className="mt-4 text-ink/60">Nothing sold yet. Listings you mark as sold, rented or filled will show up here.</p>
        : (
          <ul className="mt-6 divide-y divide-ink/20">
            {items.map(item => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                {item.image_urls?.[0]
                  ? <img src={item.image_urls[0]} alt="" loading="lazy" className="h-14 w-14 shrink-0 border-2 border-ink object-cover" />
                  : <div aria-hidden="true" className="h-14 w-14 shrink-0 border-2 border-ink bg-sun" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold">{item.title}</p>
                  <p className="font-mono text-xs text-ink/60">
                    {doneLabel[item.category] ?? 'Completed'}
                    {item.ended_at && ` · ${new Date(item.ended_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-sm">{item.price_jpy == null ? '—' : yen.format(item.price_jpy)}</p>
              </li>
            ))}
          </ul>
        )}
    </section>
  )
}

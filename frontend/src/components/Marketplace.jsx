import useCampusData from './campus/useCampusData'

export default function Marketplace() {
  const campus = useCampusData()
  const listings = campus.listings.filter((l) => l.kind === 'market')

  if (campus.loading) return <p className="p-8 text-ink/60">Loading listings…</p>
  if (campus.signInRequired) return <p className="p-8 text-ink/60">Sign in to browse the marketplace.</p>

  return (
    <div className="min-h-screen bg-matcha/15">
      <div className="border-b-2 border-ink bg-matcha">
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
          <p className="font-mono text-xs uppercase tracking-widest text-ink/70">Buy, sell, trade</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight text-ink">Student marketplace</h1>
          <p className="mt-4 max-w-md text-ink/80">Furniture, clothes, electronics, and the occasional gig — posted by TUJ students.</p>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        {listings.length === 0 ? (
          <p className="text-ink/60">Nothing for sale right now.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <article key={l.id} className="border-2 border-ink bg-paper p-5 shadow-hard transition duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border-2 border-ink bg-matcha px-3 py-1 font-mono text-[10px] uppercase tracking-widest">{l.label}</span>
                  <span className="font-mono text-xs font-bold text-ink/80">{l.price}</span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight">{l.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">{l.detail}</p>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

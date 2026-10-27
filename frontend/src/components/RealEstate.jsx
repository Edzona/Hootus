import useCampusData from './campus/useCampusData'

export default function RealEstate() {
  const campus = useCampusData()
  const listings = campus.listings.filter((l) => l.kind === 'housing')

  if (campus.loading) return <p className="p-8 text-ink/60">Loading listings…</p>
  if (campus.signInRequired) return <p className="p-8 text-ink/60">Sign in to browse housing.</p>

  return (
    <div className="min-h-screen bg-sky/15">
      <div className="border-b-2 border-ink bg-sky">
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
          <p className="font-mono text-xs uppercase tracking-widest text-ink/70">Rooms &amp; sublets</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight text-ink">Real estate corner</h1>
          <p className="mt-4 max-w-md text-ink/80">Sublets, sharehouses, and roommate searches near TUJ and Sangenjaya.</p>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        {listings.length === 0 ? (
          <p className="text-ink/60">No rooms posted right now.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {listings.map((l) => (
              <article key={l.id} className="flex flex-col border-2 border-ink bg-paper p-6 shadow-hard transition duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full border-2 border-ink bg-sky px-3 py-1 font-mono text-[10px] uppercase tracking-widest">{l.label}</span>
                    <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight">{l.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink/70">{l.detail}</p>
                  </div>
                  <span className="shrink-0 rounded border-2 border-ink bg-paper px-3 py-2 font-mono text-sm font-bold">{l.price}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

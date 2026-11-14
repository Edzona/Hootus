import Flyer from './Flyer'
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
            {listings.map((l, i) => (
              <Flyer
                key={l.id}
                tag={l.label}
                title={l.title}
                meta={l.detail}
                price={l.price}
                tagClass={l.kind === 'housing' ? 'bg-sky' : 'bg-matcha'}
                tab="DM on HUS"
                absolute={false}
                className="w-full"
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

import SectionHeading from './SectionHeading'

const clubs = [
  { name: 'Film Club', meta: 'Screening · Fri 18:30 · Rm 302' },
  { name: 'Japan Business Society', meta: 'Mixer · Wed 17:00 · Lounge' },
  { name: 'Outdoor Club', meta: 'Takao hike · Sat 08:00 · Sangenjaya Stn.' },
]

const perks = [
  { deal: '2-for-1', what: 'Coffee near Sankaku Chitai' },
  { deal: '10% off', what: 'Curry lunch sets' },
  { deal: '¥5,000', what: 'Sharehouse referral credit' },
]

function Card({ className = '', children }) {
  return <div className={`border-2 border-paper/90 bg-ink p-6 md:p-8 ${className}`}>{children}</div>
}

function CardTitle({ kicker, children }) {
  return (
    <>
      <p className="eyebrow text-paper/50">{kicker}</p>
      <h3 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{children}</h3>
    </>
  )
}

function VerifiedCheck() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-label="Verified">
      <circle cx="10" cy="10" r="9" fill="#FFD23F" stroke="#F4EEE3" strokeWidth="1.5" />
      <path d="M6 10.5l2.5 2.5L14 7.5" fill="none" stroke="#14110F" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export default function Community() {
  return (
    <section id="community" className="border-y-2 border-ink bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 lg:py-32">
        <SectionHeading index="02" label="Beyond buy & sell" tone="dark">
          Clubs, events &amp; <span className="font-serif font-normal italic tracking-normal text-sun">perks</span> —
          all in the feed.
        </SectionHeading>

        <div className="mt-14 grid gap-5 lg:grid-cols-6">
          <Card className="lg:col-span-3">
            <CardTitle kicker="Verified club profiles">No more stale posters.</CardTitle>
            <p className="mt-3 text-paper/70">
              Badged accounts for official TUJ student orgs. Flyers, meeting times, and room numbers — always current.
            </p>
            <ul className="mt-6 divide-y divide-paper/15 border-y border-paper/15">
              {clubs.map((c) => (
                <li key={c.name} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-paper font-display font-bold">
                    {c.name[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-bold">
                      {c.name} <VerifiedCheck />
                    </span>
                    <span className="block truncate font-mono text-xs text-paper/60">{c.meta}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="lg:col-span-3">
            <CardTitle kicker="RSVPs & ticketing">Capacity, handled.</CardTitle>
            <p className="mt-3 text-paper/70">
              Clubs and faculty run limited-capacity RSVPs or sell digital entry tickets right in the app.
            </p>
            <div className="mt-6 flex text-ink" style={{ rotate: '-1.5deg' }}>
              <div className="flex-1 rounded-l-lg bg-paper p-5">
                <p className="eyebrow text-cherry">Admit one</p>
                <p className="mt-1 font-display text-2xl font-extrabold tracking-tight">Spring Gala</p>
                <p className="font-mono text-xs text-ink/60">Sat · 19:00 · ¥1,500</p>
                <div className="mt-4 h-2.5 border-2 border-ink bg-white">
                  <div className="h-full w-[91%] bg-cherry" />
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink/60">182 / 200 claimed</p>
              </div>
              <div className="relative grid w-24 place-items-center rounded-r-lg border-l-2 border-dashed border-ink bg-sun">
                <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-ink" />
                <span className="absolute -bottom-2.5 -left-2.5 h-5 w-5 rounded-full bg-ink" />
                <div className="grid grid-cols-5 gap-0.5" aria-hidden="true">
                  {'1011001101110100101101011'.split('').map((b, i) => (
                    <span key={i} className={`h-2.5 w-2.5 ${b === '1' ? 'bg-ink' : ''}`} />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-4">
            <CardTitle kicker="Local perks hub">
              <span className="font-jp text-2xl">三軒茶屋</span>, unlocked.
            </CardTitle>
            <p className="mt-3 max-w-lg text-paper/70">
              Student-only deals from Sangenjaya restaurants and English-friendly sharehouse referrals. Flash your HUS
              profile, save some yen.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {perks.map((p) => (
                <div key={p.what} className="border-2 border-dashed border-sun p-4">
                  <p className="font-display text-3xl font-extrabold text-sun">{p.deal}</p>
                  <p className="mt-1 text-sm text-paper/75">{p.what}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardTitle kicker="Real-time chat">Deal in DMs.</CardTitle>
            <div className="mt-6 space-y-2.5 text-sm">
              <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-paper/10 px-4 py-2.5">Is the desk still available?</p>
              <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-cherry px-4 py-2.5">
                Yes! Meet at the 1F lobby after 3pm?
              </p>
              <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-paper/10 px-4 py-2.5">Deal. See you then.</p>
              <p className="pt-1 font-mono text-[10px] uppercase tracking-widest text-paper/40">Seen · just now</p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}

import SectionHeading from './SectionHeading'

const feeds = [
  {
    n: '01',
    name: 'Housing',
    band: 'bg-sun',
    blurb:
      'Sublets, roommate searches, and sharehouse referrals — posted by people who actually go to TUJ, not anonymous agents.',
    chips: ['Sublets', 'Roommates', 'Sharehouses'],
  },
  {
    n: '02',
    name: 'Sales',
    band: 'bg-matcha',
    blurb: (
      <>
        Clothing, furniture, appliances, electronics. Graduating seniors&apos; stuff finds a new home instead of the{' '}
        <span className="font-jp">粗大ゴミ</span> pile.
      </>
    ),
    chips: ['Furniture', 'Electronics', 'Clothing', 'Appliances'],
  },
  {
    n: '03',
    name: 'Student Gigs',
    band: 'bg-sky',
    blurb: 'Tutoring, errands, moving help, airport runs. Earn yen from peers — or hire help you can actually trust.',
    chips: ['Tutoring', 'Errands', 'Rides', 'Moving'],
  },
]

export default function Feeds() {
  return (
    <section id="feeds" className="mx-auto max-w-7xl px-5 py-24 md:px-8 lg:py-32">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <SectionHeading index="01" label="The marketplace">
          Three feeds. <span className="font-serif font-normal italic tracking-normal text-cherry">Zero</span>{' '}
          group-chat chaos.
        </SectionHeading>
        <p className="max-w-sm text-ink/70">
          Stop scrolling 400 unread LINE messages to find a desk. Everything&apos;s sorted, searchable, and filtered by
          price.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {feeds.map((f) => (
          <article
            key={f.n}
            className="group flex flex-col border-2 border-ink bg-white shadow-hard transition duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg"
          >
            <div className={`flex items-center justify-between border-b-2 border-ink px-5 py-3 ${f.band}`}>
              <span className="font-mono text-xs font-bold uppercase tracking-widest">Feed {f.n}</span>
              <span className="font-mono text-xs transition-transform duration-200 group-hover:translate-x-1">→</span>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-display text-4xl font-extrabold tracking-tight">{f.name}</h3>
              <p className="mt-4 flex-1 leading-relaxed text-ink/70">{f.blurb}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {f.chips.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] uppercase tracking-wider"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

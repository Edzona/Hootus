import SectionHeading from './SectionHeading'

const steps = [
  { title: 'Sign in with TUJ', body: 'One tap with your @tuj.temple.edu Google account. Verified instantly.' },
  { title: 'Post or browse', body: 'Snap a photo, set a price, pick a feed. Or filter by category and budget.' },
  { title: 'Chat & meet on campus', body: 'Message in-app, then meet somewhere you already are — the lobby works.' },
]

export default function HowItWorks() {
  return (
    <section id="how" className="border-t-2 border-ink bg-sun">
      <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 lg:py-28">
        <SectionHeading index="04" label="How it works">
          Live in under a minute.
        </SectionHeading>
        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          <span
            className="absolute left-0 right-0 top-7 hidden border-t-2 border-dashed border-ink md:block"
            aria-hidden="true"
          />
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="relative grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-paper font-display text-2xl font-extrabold shadow-hard">
                {i + 1}
              </span>
              <h3 className="mt-6 font-display text-2xl font-bold tracking-tight">{s.title}</h3>
              <p className="mt-2 max-w-xs leading-relaxed text-ink/75">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

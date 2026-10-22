import { Hanko } from './Logo'
import SectionHeading from './SectionHeading'

const reasons = [
  {
    title: 'No Japanese bank needed',
    body: "Nothing on HUS is gated behind a Japanese bank account. Study-abroad for a semester? You're in.",
  },
  {
    title: 'No Japanese phone number',
    body: 'Sign in with your TUJ Google account. No SMS verification, no SIM card required.',
  },
  {
    title: 'English-first',
    body: 'Every screen and notification is in English. Japanese is welcome, never required.',
  },
  {
    title: 'Verified students only',
    body: '@tuj.temple.edu sign-in keeps scammers and randoms out. Everyone you meet is a classmate.',
  },
]

export default function WhyHus() {
  return (
    <section id="why" className="mx-auto max-w-7xl px-5 py-24 md:px-8 lg:py-32">
      <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative">
          <SectionHeading index="03" label="Why HUS">
            Built for how TUJ <span className="font-serif font-normal italic tracking-normal text-cherry">actually</span>{' '}
            works.
          </SectionHeading>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">
            Most marketplace apps in Japan assume you have a Japanese bank, a Japanese number, and Japanese fluency. Most TUJ students
            don&apos;t — at least not in their first semester.
          </p>
          <Hanko className="mt-10 h-32 w-32 text-[2.1rem]" />
        </div>
        <ol className="grid gap-px border-2 border-ink bg-ink sm:grid-cols-2">
          {reasons.map((r, i) => (
            <li key={r.title} className="bg-paper p-7">
              <span className="font-mono text-sm font-bold text-cherry">0{i + 1}</span>
              <h3 className="mt-6 font-display text-2xl font-bold leading-tight tracking-tight">{r.title}</h3>
              <p className="mt-3 leading-relaxed text-ink/70">{r.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

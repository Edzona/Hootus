import WaitlistForm from './WaitlistForm'

export default function FinalCta() {
  return (
    <section id="join" className="relative overflow-hidden border-t-2 border-ink bg-cherry text-paper">
      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-10 pt-24 md:px-8 lg:pt-32">
        <p className="eyebrow text-sun">Early access</p>
        <h2 className="mt-4 max-w-4xl font-display text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
          The campus noticeboard is going{' '}
          <span className="font-serif font-normal italic tracking-normal text-sun">digital.</span>
        </h2>
        <p className="mt-6 max-w-xl text-lg text-paper/80">
          Drop your TUJ email and be first in when HUS opens to the student body.
        </p>
        <div className="mt-10">
          <WaitlistForm tone="dark" />
        </div>
        <p className="mt-6 font-mono text-xs uppercase tracking-widest text-paper/60">
          Already have a student ID?{' '}
          <a href="#/signup" className="link-underline pb-1 text-sun">
            Create your account →
          </a>
        </p>
      </div>
      <p
        className="pointer-events-none select-none text-center font-display text-[38vw] font-extrabold leading-[0.75] tracking-[-0.06em] text-cherry-dark"
        aria-hidden="true"
      >
        HUS
      </p>
    </section>
  )
}

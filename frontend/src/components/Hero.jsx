import Flyer from './Flyer'
import Logo from './Logo'
import WaitlistForm from './WaitlistForm'

function VerifiedBadge({ className = '' }) {
  return (
    <div className={`h-28 w-28 ${className}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="spin-slow absolute inset-0 h-full w-full">
        <defs>
          <path id="badge-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <circle cx="50" cy="50" r="49" fill="#FFD23F" stroke="#14110F" strokeWidth="2" />
        <text className="fill-ink font-mono text-[9.5px] font-bold uppercase" letterSpacing="2.4">
          <textPath href="#badge-circle">Verified · TUJ students only ·</textPath>
        </text>
      </svg>
      <Logo className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2" />
    </div>
  )
}

function FlyerBoard() {
  return (
    <div className="relative h-[620px] sm:h-[640px]">
      <Flyer
        tag="Housing"
        title="1LDK sublet, 6 min to Sangenjaya Stn."
        meta="Jan – May · furnished · utilities incl."
        price="¥78,000/mo"
        rotate={-4}
        delay={250}
        className="left-0 top-2 w-[62%] sm:w-[54%]"
      />
      <Flyer
        tag="For sale"
        tagClass="bg-matcha"
        pinClass="bg-sun"
        title="IKEA desk + chair, barely used"
        meta="Pickup at TUJ main campus"
        price="¥3,500"
        rotate={5}
        delay={400}
        className="right-0 top-28 w-[52%] sm:w-[46%]"
      />
      <Flyer
        tag="Gig"
        tagClass="bg-sky"
        pinClass="bg-ink"
        title="Japanese N4 tutor, after class"
        meta="Native speaker · flexible hours"
        price="¥2,000/hr"
        rotate={3}
        delay={550}
        className="bottom-6 left-[4%] w-[50%] sm:w-[44%]"
      />
      <Flyer
        tag="Event · Verified club"
        tagClass="bg-cherry text-paper"
        pinClass="bg-matcha"
        title="Film Club: Friday night screening"
        meta="Room 302 · 18:30"
        tab="RSVP"
        rotate={-3}
        delay={700}
        className="bottom-0 right-[2%] w-[50%] sm:w-[46%]"
      >
        <div className="mt-3">
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-ink/60">
            <span>RSVPs</span>
            <span>31 / 40</span>
          </div>
          <div className="mt-1 h-2.5 border-2 border-ink bg-paper">
            <div className="h-full w-[77%] bg-cherry" />
          </div>
        </div>
      </Flyer>
      <VerifiedBadge className="absolute -top-3 right-0 z-30 hidden sm:block" />
    </div>
  )
}

export default function Hero() {
  return (
    <section
      id="top"
      className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-12 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-20"
    >
      <div className="relative z-10">
        <p className="rise eyebrow text-cherry">
          Temple University Japan · <span className="font-jp tracking-normal">三軒茶屋</span> · Students only
        </p>
        <h1
          className="rise mt-6 font-display text-[clamp(3.25rem,8.5vw,7rem)] font-extrabold leading-[0.88] tracking-[-0.045em]"
          style={{ '--d': '100ms' }}
        >
          Sublet it.
          <br />
          Sell it.
          <br />
          Gig it.
          <br />
          <span className="font-serif font-normal italic tracking-[-0.01em] text-cherry">TUJ only.</span>
        </h1>
        <p className="rise mt-8 max-w-xl text-lg leading-relaxed text-ink/75" style={{ '--d': '200ms' }}>
          HUS is the marketplace and club hub for TUJ students — housing, sales, gigs, events, and Sangenjaya
          perks in one feed. No Japanese bank account. No Japanese phone number. Just your{' '}
          <span className="whitespace-nowrap font-mono text-base text-ink">@tuj.temple.edu</span> email.
        </p>
        <div className="rise mt-10" style={{ '--d': '300ms' }}>
          <WaitlistForm />
        </div>
        <p className="rise mt-4 font-mono text-[11px] uppercase tracking-widest text-ink/50" style={{ '--d': '400ms' }}>
          Verified students only · English-first · Free
        </p>
      </div>
      <FlyerBoard />
    </section>
  )
}

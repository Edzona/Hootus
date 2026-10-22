export default function Flyer({
  tag,
  tagClass = 'bg-sun',
  pinClass = 'bg-cherry',
  title,
  meta,
  price,
  tab = 'DM on HUS',
  rotate = 0,
  delay = 0,
  className = '',
  children,
}) {
  return (
    <article className={`flyer absolute ${className}`} style={{ '--r': `${rotate}deg`, '--d': `${delay}ms` }}>
      <span
        className={`absolute left-1/2 top-2 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-ink ${pinClass} shadow-[0_3px_0_rgba(20,17,15,.35)]`}
        aria-hidden="true"
      />
      <div className="border-2 border-ink bg-white p-4 pt-7 shadow-flyer">
        <span
          className={`inline-block -rotate-2 border-2 border-ink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${tagClass}`}
        >
          {tag}
        </span>
        <h3 className="mt-3 font-display text-lg font-bold leading-tight tracking-tight sm:text-xl">{title}</h3>
        {meta && <p className="mt-1 text-sm leading-snug text-ink/60">{meta}</p>}
        {children}
        {price && <p className="mt-3 font-mono text-base font-bold sm:text-lg">{price}</p>}
      </div>
      <div className="flex border-x-2 border-b-2 border-ink bg-white" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={`flex h-16 flex-1 items-center justify-center border-r border-dashed border-ink/40 font-mono text-[8px] uppercase tracking-wider text-ink/60 [writing-mode:vertical-rl] last:border-r-0 ${
              i === 2 ? 'translate-y-1.5 -rotate-3 bg-paper' : ''
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
    </article>
  )
}

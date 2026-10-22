export default function SectionHeading({ index, label, children, tone = 'light', className = '' }) {
  return (
    <div className={className}>
      <p className={`eyebrow ${tone === 'dark' ? 'text-sun' : 'text-cherry'}`}>
        {index} — {label}
      </p>
      <h2 className="mt-4 max-w-3xl font-display text-[clamp(2.25rem,5vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
        {children}
      </h2>
    </div>
  )
}

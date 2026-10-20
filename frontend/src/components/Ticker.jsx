const items = [
  'Rice cooker — ¥2,500',
  'Roommate wanted · Setagaya',
  'Calc II tutor · ¥1,800/hr',
  'Bike + lock — ¥6,000',
  'Jazz Club jam · Fri 18:00',
  'Curry spot · 10% off w/ HUS',
  'Moving sale: mini fridge',
  'Narita run · split a cab',
]

export default function Ticker() {
  return (
    <div className="overflow-hidden border-y-2 border-ink bg-ink py-3 text-paper" aria-label="Recent listings">
      <div className="marquee flex w-max font-mono text-sm uppercase tracking-widest">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-10 pr-10" aria-hidden={i >= items.length}>
            <span>{item}</span>
            <span className="text-sun">✳</span>
          </span>
        ))}
      </div>
    </div>
  )
}

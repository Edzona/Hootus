import { Wordmark } from './Logo'

const tabs = [
  { id: 'community', label: 'Community', href: '#/dashboard' },
  { id: 'marketplace', label: 'Marketplace', href: '#/marketplace' },
  { id: 'real-estate', label: 'Real estate', href: '#/real-estate' },
]

const accent = {
  community: 'border-cherry',
  marketplace: 'border-matcha',
  'real-estate': 'border-sky',
}

function activeFromHash(hash) {
  if (hash.startsWith('#/marketplace')) return 'marketplace'
  if (hash.startsWith('#/real-estate')) return 'real-estate'
  return 'community'
}

export default function HubNav({ hash }) {
  const active = activeFromHash(hash)
  return (
    <header className="w-full border-b-2 border-ink bg-paper">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8" aria-label="HUS hub">
        <a href="#/dashboard" aria-label="HUS home">
          <Wordmark />
        </a>
        <ul className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = active === tab.id
            return (
              <li key={tab.id}>
                <a
                  href={tab.href}
                  className={`block border-b-4 px-4 py-2 font-mono text-xs uppercase tracking-widest ${isActive ? `bg-ink text-paper ${accent[active]}` : 'border-transparent text-ink hover:bg-ink/5'}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {tab.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}

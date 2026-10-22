import { Wordmark } from './Logo'

const links = [
  ['Marketplace', '#feeds'],
  ['Clubs & Orgs', '#/clubs'],
  ['Why HUS', '#why'],
  ['How it works', '#how'],
]

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
        <a href="#top" aria-label="HUS home">
          <Wordmark />
        </a>
        <ul className="hidden items-center gap-8 font-mono text-xs uppercase tracking-widest md:flex">
          {links.map(([label, href]) => (
            <li key={href}>
              <a className="link-underline pb-1" href={href}>
                {label}
              </a>
            </li>
          ))}
        </ul>
        <a href="#/signup" className="btn-primary px-4 py-2.5">
          Create account
        </a>
      </nav>
    </header>
  )
}

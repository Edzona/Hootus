import { Wordmark } from './Logo'

export default function Footer() {
  return (
    <footer className="border-t-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <Wordmark />
        <p className="font-mono text-xs uppercase tracking-widest text-ink/60">
          Built by TUJ students in <span className="font-jp normal-case tracking-normal">三軒茶屋</span>, Tokyo
        </p>
        <p className="font-mono text-xs text-ink/50">© {new Date().getFullYear()} HUS</p>
      </div>
    </footer>
  )
}

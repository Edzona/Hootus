export default function Logo({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="#A41E34" stroke="#14110F" strokeWidth="3" />
      <path d="M10 12 L17 17.5 M38 12 L31 17.5" stroke="#14110F" strokeWidth="3" strokeLinecap="round" />
      <circle cx="17" cy="24" r="7" fill="#F4EEE3" stroke="#14110F" strokeWidth="2.5" />
      <circle cx="31" cy="24" r="7" fill="#F4EEE3" stroke="#14110F" strokeWidth="2.5" />
      <circle cx="18.5" cy="24.5" r="2.8" fill="#14110F" />
      <circle cx="32.5" cy="24.5" r="2.8" fill="#14110F" />
      <path d="M21.5 32 L24 37 L26.5 32 Z" fill="#FFD23F" stroke="#14110F" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export function Wordmark({ className = '' }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Logo className="h-9 w-9" />
      <span className="font-display text-2xl font-extrabold tracking-tight">HUS</span>
    </span>
  )
}

export function Hanko({ className = '' }) {
  return (
    <div
      className={`grid place-items-center rounded-full border-[3px] border-cherry text-cherry outline outline-1 -outline-offset-[8px] outline-cherry ${className}`}
      style={{ rotate: '-12deg' }}
      aria-hidden="true"
    >
      <span className="flex flex-col text-center font-display font-extrabold leading-[0.82]">
        <span>H</span>
        <span>U</span>
        <span>S</span>
      </span>
    </div>
  )
}

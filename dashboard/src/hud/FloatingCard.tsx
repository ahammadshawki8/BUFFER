import { useState, type ReactNode } from 'react'

// A HUD card that can be minimised to a small floating circle and opened again.
// The open/closed choice is remembered per browser; recordings always show the card.

const forceOpen = (() => {
  const p = new URLSearchParams(location.search)
  return p.has('record') || p.has('capture')
})()

function useOpen(id: string): [boolean, (v: boolean) => void] {
  const key = `buffer.card.${id}`
  const [open, setOpen] = useState(() => {
    if (forceOpen) return true
    try {
      return localStorage.getItem(key) !== 'closed'
    } catch {
      return true
    }
  })
  const set = (v: boolean) => {
    setOpen(v)
    try {
      localStorage.setItem(key, v ? 'open' : 'closed')
    } catch {
      // storage blocked: the choice lasts for this visit only
    }
  }
  return [open, set]
}

export function FloatingCard({ id, title, icon, className, children }: { id: string; title: string; icon: ReactNode; className: string; children: ReactNode }) {
  const [open, setOpen] = useOpen(id)
  if (!open) {
    return (
      <button className={`card-fab ${className}`} onClick={() => setOpen(true)} aria-label={`Open ${title}`} title={title}>
        {icon}
      </button>
    )
  }
  return (
    <section className={`panel ${className} is-floating`} aria-label={title}>
      {!forceOpen && (
        <button className="card-close" onClick={() => setOpen(false)} aria-label={`Minimise ${title}`} title="Minimise">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 8h9" />
          </svg>
        </button>
      )}
      {children}
    </section>
  )
}

export const ChartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 19V5M4 19h16" />
    <path d="M7 8l4 6 3-3 5 6" className="accent" />
  </svg>
)

export const RouteIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v6" />
    <path d="M12 9c0 4-6 4-6 9" className="accent" />
    <path d="M12 9c0 4 6 4 6 9" />
    <circle cx="6" cy="20" r="1.4" className="accent-fill" />
    <circle cx="18" cy="20" r="1.4" />
  </svg>
)

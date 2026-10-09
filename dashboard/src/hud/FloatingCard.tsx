import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

// A HUD card that can be dragged anywhere on screen, minimised to a small floating
// circle and opened again. Position and open/closed state are remembered per browser;
// recordings always show the card open in its default place.

const fixed = (() => {
  const p = new URLSearchParams(location.search)
  return p.has('record') || p.has('capture')
})()

type Offset = { x: number; y: number }

function load<T>(key: string, fallback: T): T {
  if (fixed) return fallback
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage blocked: the choice lasts for this visit only
  }
}

// Controls inside a card keep their own behaviour; dragging starts anywhere else.
const INTERACTIVE = 'button, input, select, textarea, label, a, [role="tab"]'

export function FloatingCard({ id, title, icon, className, children }: { id: string; title: string; icon: ReactNode; className: string; children: ReactNode }) {
  const openKey = `buffer.card.${id}`
  const posKey = `buffer.card.${id}.pos`
  const [open, setOpenState] = useState<boolean>(() => load(openKey, true))
  const [offset, setOffsetState] = useState<Offset>(() => load(posKey, { x: 0, y: 0 }))
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ px: number; py: number; start: Offset; rect: DOMRect } | null>(null)
  const lastGripDown = useRef(0)

  const setOpen = (v: boolean) => {
    setOpenState(v)
    save(openKey, v)
  }
  const setOffset = (o: Offset, persist = false) => {
    setOffsetState(o)
    if (persist) save(posKey, o)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (fixed || e.button !== 0) return
    const onGrip = !!(e.target as HTMLElement).closest('.card-grip')
    if ((e.target as HTMLElement).closest(INTERACTIVE) && !onGrip) return
    // Pointer capture swallows dblclick, so a double press on the grip is detected here.
    if (onGrip) {
      const now = e.timeStamp
      if (now - lastGripDown.current < 350) {
        lastGripDown.current = 0
        setOffset({ x: 0, y: 0 }, true)
        return
      }
      lastGripDown.current = now
    }
    const el = e.currentTarget
    drag.current = { px: e.clientX, py: e.clientY, start: offset, rect: el.getBoundingClientRect() }
    el.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    const margin = 8
    // keep the whole card inside the window
    const dx = Math.min(Math.max(e.clientX - d.px, margin - d.rect.left), innerWidth - margin - d.rect.right)
    const dy = Math.min(Math.max(e.clientY - d.py, margin - d.rect.top), innerHeight - margin - d.rect.bottom)
    setOffset({ x: d.start.x + dx, y: d.start.y + dy })
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current) return
    drag.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
    setOffset(offset, true)
  }

  const place = { translate: `${offset.x}px ${offset.y}px` }

  if (!open) {
    return (
      <button className={`card-fab ${className}`} style={place} onClick={() => setOpen(true)} aria-label={`Open ${title}`} title={title}>
        {icon}
      </button>
    )
  }
  return (
    <section
      className={`panel ${className} is-floating ${fixed ? '' : 'is-draggable'} ${dragging ? 'is-dragging' : ''}`}
      style={place}
      aria-label={title}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {!fixed && (
        <div className="card-tools">
          <button
            className="card-grip"
            title="Drag to move. Double-click to put it back."
            aria-label={`Move ${title}. Double-click to reset its position.`}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {[4, 8, 12].map((y) => [5.5, 10.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" />))}
            </svg>
          </button>
          <button className="card-close" onClick={() => setOpen(false)} aria-label={`Minimise ${title}`} title="Minimise">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 8h9" />
            </svg>
          </button>
        </div>
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

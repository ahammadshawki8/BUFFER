import { useEffect, useState } from 'react'

// First-visit brand intro: the tank-battery mark draws itself, charges in steps,
// shows the protected reserve, then the wordmark widens into place.
// Plays once per browser; ?intro replays it; any click or key skips it.

const KEY = 'buffer.introSeen'
const LENGTH_MS = 4700

const params = new URLSearchParams(location.search)

export function shouldPlayIntro() {
  if (params.has('capture') || params.has('record')) return false
  if (params.has('intro')) return true
  try {
    return localStorage.getItem(KEY) !== '1'
  } catch {
    return true
  }
}

export function Intro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const finish = () => {
      try {
        localStorage.setItem(KEY, '1')
      } catch {
        // storage blocked: the intro simply plays again next time
      }
      onDone()
    }
    const leave = setTimeout(() => setLeaving(true), LENGTH_MS - 650)
    const done = setTimeout(finish, LENGTH_MS)
    const skip = () => {
      clearTimeout(leave)
      clearTimeout(done)
      setLeaving(true)
      setTimeout(finish, 450)
    }
    addEventListener('keydown', skip, { once: true })
    return () => {
      clearTimeout(leave)
      clearTimeout(done)
      removeEventListener('keydown', skip)
    }
  }, [onDone])

  return (
    <div
      className={`intro ${leaving ? 'is-leaving' : ''}`}
      role="img"
      aria-label="BUFFER: Protect the water you cannot replace."
      onClick={() => dispatchEvent(new KeyboardEvent('keydown'))}
    >
      <div className="intro-stage">
        <svg className="intro-mark" viewBox="0 0 28 32" aria-hidden="true">
          <defs>
            <clipPath id="intro-cell">
              <rect x="6.4" y="7.9" width="15.2" height="19.5" rx="2.6" />
            </clipPath>
          </defs>
          <rect className="i-cell" x="3.2" y="5" width="21.6" height="25.6" rx="5.6" pathLength="100" />
          <rect className="i-cap" x="10" y="0.8" width="8" height="3.4" rx="1.3" />
          <g clipPath="url(#intro-cell)">
            <g className="i-water">
              <path className="i-wave" d="M0 0 Q 3.5 -1.1 7 0 T 14 0 T 21 0 T 28 0 T 35 0 T 42 0 V 22 H 0 Z" />
            </g>
          </g>
          <line className="i-reserve" x1="9" y1="22.6" x2="19" y2="22.6" />
        </svg>
        <div className="intro-word" aria-hidden="true">
          {'BUFFER'.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${1.95 + i * 0.07}s` }}>
              {ch}
            </span>
          ))}
        </div>
        <p className="intro-tag">Protect the water you cannot replace.</p>
      </div>
      <button
        className="intro-skip"
        onClick={(e) => {
          e.stopPropagation()
          dispatchEvent(new KeyboardEvent('keydown'))
        }}
      >
        Skip
      </button>
    </div>
  )
}

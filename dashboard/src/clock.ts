// One shared demo clock. React reads it via useClock(); the 3D scene reads
// clock.t directly inside useFrame so it never re-renders React per frame.
import { useSyncExternalStore } from 'react'
import { app } from './app'
import { DURATION } from './timeline'

type Listener = () => void

const params = new URLSearchParams(location.search)

export const clock = {
  t: Number(params.get('t') ?? 0),
  playing: params.get('autoplay') !== '0',
  capture: params.has('capture'), // frames are set externally, no real-time playback
  listeners: new Set<Listener>(),
  set(t: number) {
    // explore mode has no script, so its clock simply keeps running
    this.t = app.explore ? Math.max(0, t) : Math.min(DURATION, Math.max(0, t))
    this.listeners.forEach((l) => l())
  },
  toggle() {
    if (this.t >= DURATION) this.t = 0
    this.playing = !this.playing
    this.listeners.forEach((l) => l())
  },
}

if (!clock.capture) {
  let last = performance.now()
  const tick = (now: number) => {
    const dt = (now - last) / 1000
    last = now
    if (clock.playing || app.explore) {
      if (!app.explore && clock.t >= DURATION) clock.playing = false
      else clock.set(clock.t + dt)
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
} else {
  clock.playing = false
  // frames are stepped externally, so real-time CSS transitions must not run
  document.documentElement.classList.add('capture')
}

declare global {
  interface Window {
    __buffer: { setTime: (t: number) => void; duration: number }
  }
}
window.__buffer = { setTime: (t) => clock.set(t), duration: DURATION }

// Space bar pauses and resumes, unless a control has focus.
addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || clock.capture || app.explore) return
  const el = document.activeElement
  if (el && (el.tagName === 'INPUT' || el.tagName === 'BUTTON')) return
  e.preventDefault()
  clock.toggle()
})

const subscribe = (l: Listener) => {
  clock.listeners.add(l)
  return () => clock.listeners.delete(l)
}

export function useClock() {
  return useSyncExternalStore(subscribe, () => clock.t)
}

export function usePlaying() {
  return useSyncExternalStore(subscribe, () => clock.playing)
}

export function setExplore(on: boolean) {
  app.explore = on
  app.request = null
  app.bufferChangedAt = -10
  if (on) {
    clock.playing = false
  } else {
    clock.t = 0
    clock.playing = true
  }
  app.emit()
  clock.listeners.forEach((l) => l())
}

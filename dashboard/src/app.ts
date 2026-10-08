// App mode and the explore-mode scenario. The guided demo is scripted by the
// timeline; explore mode runs the same model on whatever the viewer sets.
import { useSyncExternalStore } from 'react'
import type { Endpoint, Household } from './model'

export interface Scenario {
  people: number
  stored: number
  criticalLpcd: number
  flexibleLpcd: number
  reserveDays: number
  rainDay: number
  bufferOn: boolean
  altAvailable: boolean
}

export const defaultScenario: Scenario = {
  people: 5,
  stored: 200,
  criticalLpcd: 4,
  flexibleLpcd: 6,
  reserveDays: 1,
  rainDay: 7,
  bufferOn: true,
  altAvailable: true,
}

export function householdOf(s: Scenario): Household {
  const critical = s.people * s.criticalLpcd
  return {
    people: s.people,
    stored: s.stored,
    critical,
    flexible: s.people * s.flexibleLpcd,
    reserve: Math.min(s.stored, critical * s.reserveDays),
  }
}

type Listener = () => void

export const app = {
  explore: new URLSearchParams(location.search).has('explore'),
  scenario: { ...defaultScenario },
  bufferChangedAt: -10, // clock time of the last BUFFER toggle, for the switch animation
  request: null as { endpoint: Endpoint; at: number } | null,
  version: 0,
  listeners: new Set<Listener>(),
  emit() {
    this.version++
    this.listeners.forEach((l) => l())
  },
}

const subscribe = (l: Listener) => {
  app.listeners.add(l)
  return () => app.listeners.delete(l)
}

export function useApp() {
  return useSyncExternalStore(subscribe, () => app.version)
}

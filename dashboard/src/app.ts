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
  override: boolean // household forces freshwater for every use
  advisory: boolean // BUFFER Lite: recommends sources instead of switching valves
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
  override: false,
  advisory: false,
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

// One telemetry line from the controller (hardware/serial-protocol.md).
export interface Telemetry {
  t: number
  fresh_l: number
  alt_l: number
  cap_l?: number
  sensor_ok: number
  alt_ok: number
  rain_days: number
  mode: 'NORMAL' | 'PRESERVE' | 'CRITICAL' | 'FAULT'
  strict: number
  runway: number
  gap: number
  allowance: number
  draw: number
  conv_runway: number
  flex_used: number
  valve_a: number
  valve_b: number
  flow_a: number
  flow_b: number
  request: string
  source: string
  override: number
  critical: number
  flexible: number
  reserve: number
  event: string
}

type Listener = () => void

export const app = {
  explore: new URLSearchParams(location.search).has('explore'),
  scenario: { ...defaultScenario },
  bufferChangedAt: -10, // clock time of the last BUFFER toggle, for the switch animation
  request: null as { endpoint: Endpoint; at: number } | null,
  // Live device: telemetry from the ESP32 over Web Serial (or injected in tests).
  live: {
    on: false,
    status: 'idle' as 'idle' | 'connecting' | 'connected' | 'error',
    message: '',
    telemetry: null as Telemetry | null,
    requestSeenAt: 0,
    send: null as ((cmd: object) => void) | null,
  },
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

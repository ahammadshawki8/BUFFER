// The scripted 45-second demo. Every visual reads from frame(t), so a given t
// always renders identically (needed for frame-by-frame video capture).
// In explore mode frame(t) instead runs the model on the viewer's scenario.
import { app, householdOf } from './app'
import { buffered, conventional, household, route, type Endpoint, type Household, type Plan, type Source } from './model'

export const DURATION = 45

export const steps = [
  { at: 0, title: 'The problem', text: 'At today’s use, the freshwater tank runs dry before the next reliable rain.' },
  { at: 8, title: 'Conventional use', text: 'Every task, from cooking to the toilet, draws from the same freshwater tank.' },
  { at: 18, title: 'BUFFER takes over', text: 'The controller switches to Preserve and starts routing by priority.' },
  { at: 20.5, title: 'Sources rerouted', text: 'Flexible tasks open valve B. Drinking and cooking still open valve A.' },
  { at: 30, title: 'Rain is delayed', text: 'The forecast moves the next reliable rain from day 7 to day 9.' },
  { at: 33.5, title: 'Reserve tightened', text: 'BUFFER removes the remaining flexible-use allowance to hold the reserve longer.' },
  { at: 38, title: 'The outcome', text: 'Same stored water. Different outcome.' },
] as const

// Demand requests sent to the rig, in order.
const requests: { from: number; to: number; endpoint: Endpoint }[] = [
  { from: 9, to: 11.6, endpoint: 'toilet' },
  { from: 12, to: 14.6, endpoint: 'floor' },
  { from: 15, to: 17.6, endpoint: 'kitchen' },
  { from: 20.5, to: 23, endpoint: 'toilet' },
  { from: 23, to: 25.3, endpoint: 'floor' },
  { from: 25.8, to: 29.6, endpoint: 'kitchen' },
  { from: 32, to: 35.2, endpoint: 'washing' },
  { from: 35.6, to: 37.8, endpoint: 'kitchen' },
]

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smooth = (a: number, b: number, t: number) => {
  const x = clamp01((t - a) / (b - a))
  return x * x * (3 - 2 * x)
}
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k

export interface Frame {
  explore: boolean
  h: Household
  altAvailable: boolean
  t: number
  step: number
  stepProgress: number
  bufferOn: boolean
  bufferBlend: number // 0 conventional → 1 BUFFER, for animated numbers
  rainDay: number // animated during the delay
  plan: Plan // what the controller is running now
  conv: Plan
  request: { endpoint: Endpoint; source: Source; age: number; left: number } | null
  valveA: boolean
  valveB: boolean
  redReveal: number
  blueReveal: number
  warning: number // opacity of the shortage banner
  delayToast: number
  tightenToast: number
  outcome: number // opacity of the final comparison
  allowanceShown: number
}

// Seconds of rig flow drawn from a source up to time t (drives tank levels).
export function flowSeconds(t: number, source: Source) {
  let s = 0
  for (const q of requests) {
    if (route(q.endpoint, q.from >= 18) !== source) continue
    s += Math.max(0, Math.min(t, q.to) - q.from)
  }
  return s
}

export function stepAt(t: number) {
  let s = 0
  for (let i = 0; i < steps.length; i++) if (t >= steps[i].at) s = i
  return s
}

export function frame(t: number): Frame {
  return app.explore ? exploreFrame(t) : scriptFrame(t)
}

function scriptFrame(t: number): Frame {
  const step = stepAt(t)
  const next = steps[step + 1]?.at ?? DURATION
  const stepProgress = clamp01((t - steps[step].at) / (next - steps[step].at))

  const bufferOn = t >= 18
  const bufferBlend = smooth(18, 19.4, t)
  // The forecast moves first; the controller replans a moment later, so the
  // shortage gap is briefly visible before BUFFER closes it.
  const rainDay = lerp(7, 9, smooth(30.2, 31.2, t))
  const policyRain = lerp(7, 9, smooth(32, 34, t))

  const conv = conventional(rainDay)
  const plan = bufferOn ? { ...buffered(policyRain), rainDay } : conv
  plan.gap = Math.max(0, rainDay - plan.runway)

  const r = requests.find((q) => t >= q.from && t < q.to)
  const request = r
    ? { endpoint: r.endpoint, source: route(r.endpoint, bufferOn), age: t - r.from, left: r.to - t }
    : null
  // Valves lead the flow slightly: they click open as the request starts.
  const valveA = !!request && request.source === 'fresh'
  const valveB = !!request && request.source === 'alt'

  return {
    explore: false,
    h: household,
    altAvailable: true,
    t,
    step,
    stepProgress,
    bufferOn,
    bufferBlend,
    rainDay,
    plan,
    conv,
    request,
    valveA,
    valveB,
    redReveal: smooth(1.2, 5, t),
    blueReveal: smooth(18.6, 21, t),
    warning: smooth(4.2, 4.8, t) * (1 - smooth(18, 18.5, t)),
    delayToast: smooth(30, 30.4, t) * (1 - smooth(34.5, 35, t)),
    tightenToast: smooth(33.5, 33.9, t) * (1 - smooth(37.6, 38, t)),
    outcome: smooth(38, 39, t),
    allowanceShown: plan.allowance,
  }
}

// How long one tap on a use keeps its valve open in explore mode.
export const REQUEST_SECONDS = 4

function exploreFrame(t: number): Frame {
  const sc = app.scenario
  const h = householdOf(sc)
  const conv = conventional(sc.rainDay, h)
  const bufferBlend = sc.bufferOn ? smooth(app.bufferChangedAt, app.bufferChangedAt + 1.2, t) : 1 - smooth(app.bufferChangedAt, app.bufferChangedAt + 1.2, t)
  const plan = sc.bufferOn ? buffered(sc.rainDay, h, sc.altAvailable) : conv

  const q = app.request
  const live = q && t >= q.at && t < q.at + REQUEST_SECONDS
  const request = live
    ? { endpoint: q.endpoint, source: route(q.endpoint, sc.bufferOn, sc.altAvailable), age: t - q.at, left: q.at + REQUEST_SECONDS - t }
    : null

  return {
    explore: true,
    h,
    altAvailable: sc.altAvailable,
    t,
    step: -1,
    stepProgress: 0,
    bufferOn: sc.bufferOn,
    bufferBlend,
    rainDay: sc.rainDay,
    plan,
    conv,
    request,
    valveA: !!request && request.source === 'fresh',
    valveB: !!request && request.source === 'alt',
    redReveal: 1,
    blueReveal: bufferBlend,
    warning: !sc.bufferOn && conv.gap > 0 ? 1 : 0,
    delayToast: 0,
    tightenToast: 0,
    outcome: 0,
    allowanceShown: plan.allowance,
  }
}

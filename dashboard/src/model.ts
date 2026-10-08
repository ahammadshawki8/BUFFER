// BUFFER reserve model. All volumes in litres, all rates in litres per day.
// The allocation rule is the same one tested in simulation/buffer_sim/model.py.

export interface Household {
  people: number
  stored: number // freshwater in the reserve at day 0
  critical: number // drinking + cooking
  flexible: number // toilet, floor cleaning, selected washing
  reserve: number // protected critical reserve, never routed to flexible use
}

// The guided demo household. Values are ASSUMPTIONS chosen for the demo (PROJECT.md §88).
export const household: Household = {
  people: 5,
  stored: 200,
  critical: 20,
  flexible: 30,
  reserve: 20,
}

export type Endpoint = 'kitchen' | 'toilet' | 'floor' | 'washing'
export type Source = 'fresh' | 'alt'
export type Mode = 'NORMAL' | 'PRESERVE' | 'CRITICAL'

export const endpoints: Record<Endpoint, { name: string; use: string; critical: boolean }> = {
  kitchen: { name: 'Drinking & cooking', use: 'Kitchen tap', critical: true },
  toilet: { name: 'Toilet', use: 'Latrine cistern', critical: false },
  floor: { name: 'Floor cleaning', use: 'Bucket fill', critical: false },
  washing: { name: 'Selected washing', use: 'Wash slab', critical: false },
}

export interface Plan {
  mode: Mode
  strict: boolean
  draw: number // freshwater drawn per day under this policy
  allowance: number // freshwater still allowed for flexible use
  runway: number // days of critical service the freshwater provides
  runwayBasis: 'empty' | 'reserve'
  rainDay: number
  gap: number // days between runway and recharge, positive = shortage
  rationed: number // flexible demand left unserved because no safe source is available
}

export function conventional(rainDay: number, h: Household = household): Plan {
  const draw = h.critical + h.flexible
  const runway = h.stored / draw
  return {
    mode: 'NORMAL',
    strict: false,
    draw,
    allowance: h.flexible,
    runway,
    runwayBasis: 'empty',
    rainDay,
    gap: Math.max(0, rainDay - runway),
    rationed: 0,
  }
}

// PROJECT.md §42: whatever is left after the protected reserve and the critical
// demand until recharge may be spent on flexible use.
export function buffered(rainDay: number, h: Household = household, altAvailable = true): Plan {
  const usable = h.stored - h.reserve
  const unmet = (allowance: number) => (altAvailable ? 0 : h.flexible - allowance)
  if (usable >= rainDay * (h.critical + h.flexible)) {
    const draw = h.critical + h.flexible
    return { mode: 'NORMAL', strict: false, draw, allowance: h.flexible, runway: usable / draw, runwayBasis: 'reserve', rainDay, gap: 0, rationed: 0 }
  }
  const spare = usable - h.critical * rainDay
  if (spare < 0) {
    const runway = Math.max(0, usable / h.critical)
    return { mode: 'CRITICAL', strict: true, draw: h.critical, allowance: 0, runway, runwayBasis: 'reserve', rainDay, gap: rainDay - runway, rationed: unmet(0) }
  }
  const allowance = Math.min(h.flexible, spare / rainDay)
  const draw = h.critical + allowance
  const runway = usable / draw
  return {
    mode: 'PRESERVE',
    strict: allowance < 0.05,
    draw,
    allowance,
    runway,
    runwayBasis: 'reserve',
    rainDay,
    gap: Math.max(0, rainDay - runway),
    rationed: unmet(allowance),
  }
}

// Which valve serves a use. Without a usable alternative source, flexible uses
// fall back to freshwater within BUFFER's allowance.
export function route(endpoint: Endpoint, bufferOn: boolean, altAvailable = true): Source {
  if (!bufferOn || !altAvailable) return 'fresh'
  return endpoints[endpoint].critical ? 'fresh' : 'alt'
}

// Freshwater remaining on day d for a plan. BUFFER holds at the reserve floor.
export function remaining(plan: Plan, d: number, h: Household = household): number {
  if (plan.runwayBasis === 'empty') return Math.max(0, h.stored - plan.draw * d)
  return Math.max(Math.min(h.reserve, h.stored), h.stored - plan.draw * d)
}

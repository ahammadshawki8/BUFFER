// BUFFER reserve model. All volumes in liters, all rates in liters per day.
// Scenario values are ASSUMPTIONS chosen for the demo (see PROJECT.md §88).

export const household = {
  people: 5,
  stored: 200, // freshwater in the reserve at day 0
  critical: 20, // drinking + cooking
  flexible: 30, // toilet, floor cleaning, selected washing, hygiene
  reserve: 20, // protected critical reserve, never routed to flexible use
  hygieneCap: 8, // max freshwater BUFFER may still allow for hygiene-sensitive use
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
  allowance: number // freshwater still allowed for hygiene-sensitive use
  runway: number // days of critical service the freshwater provides
  runwayBasis: 'empty' | 'reserve'
  rainDay: number
  gap: number // days between runway and recharge, positive = shortage
}

export function conventional(rainDay: number): Plan {
  const draw = household.critical + household.flexible
  const runway = household.stored / draw
  return {
    mode: 'NORMAL',
    strict: false,
    draw,
    allowance: household.flexible,
    runway,
    runwayBasis: 'empty',
    rainDay,
    gap: rainDay - runway,
  }
}

// MVP allocation rule from PROJECT.md §42: whatever is left after the protected
// reserve and critical demand until recharge may be spent on flexible use.
export function buffered(rainDay: number): Plan {
  const { stored, reserve, critical, flexible, hygieneCap } = household
  const usable = stored - reserve
  if (usable >= rainDay * (critical + flexible)) {
    const draw = critical + flexible
    return { mode: 'NORMAL', strict: false, draw, allowance: flexible, runway: usable / draw, runwayBasis: 'reserve', rainDay, gap: 0 }
  }
  const spare = usable - critical * rainDay
  if (spare < 0) {
    return { mode: 'CRITICAL', strict: true, draw: critical, allowance: 0, runway: usable / critical, runwayBasis: 'reserve', rainDay, gap: rainDay - usable / critical }
  }
  const allowance = Math.min(hygieneCap, spare / rainDay)
  const draw = critical + allowance
  const runway = usable / draw
  return { mode: 'PRESERVE', strict: allowance < 0.05, draw, allowance, runway, runwayBasis: 'reserve', rainDay, gap: Math.max(0, rainDay - runway) }
}

export function route(endpoint: Endpoint, bufferOn: boolean): Source {
  if (!bufferOn) return 'fresh'
  return endpoints[endpoint].critical ? 'fresh' : 'alt'
}

// Freshwater remaining on day d for a plan. BUFFER holds at the reserve floor.
export function remaining(plan: Plan, d: number): number {
  if (plan.runwayBasis === 'empty') return Math.max(0, household.stored - plan.draw * d)
  return Math.max(household.reserve, household.stored - plan.draw * d)
}

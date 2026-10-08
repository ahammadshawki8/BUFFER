import * as THREE from 'three'

type P = [number, number, number]

// Plumbing runs as straight segments with corners, like real tubing laid on a site.
export function run(points: P[]) {
  const path = new THREE.CurvePath<THREE.Vector3>()
  for (let i = 0; i < points.length - 1; i++) {
    path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i]), new THREE.Vector3(...points[i + 1])))
  }
  return path
}

const Y = 0.32 // pipe height above the ground

export const layout = {
  tankA: [-1.6, 0, -2.4] as const,
  tankB: [2.6, 0, -2.4] as const,
  valveA: [-1.6, Y, -0.55] as const,
  valveB: [2.6, Y, -0.55] as const,
  sensorA: [-1.6, Y, 0.25] as const,
  sensorB: [2.6, Y, 0.25] as const,
  manifold: [0.5, Y, 0.9] as const,
  controller: [0.5, 0, -0.55] as const,
  kitchen: [-4.6, 0, 3.0] as const,
  toilet: [-1.5, 0, 3.4] as const,
  floor: [2.1, 0, 3.4] as const,
  washing: [5.0, 0, 3.0] as const,
}

export const runs: Record<'a' | 'b' | 'kitchen' | 'toilet' | 'floor' | 'washing', P[]> = {
  a: [
    [-1.6, 0.68, -1.5],
    [-1.6, 0.68, -1.2],
    [-1.6, Y, -1.2],
    [-1.6, Y, 0.9],
    [0.5, Y, 0.9],
  ],
  b: [
    [2.6, 0.68, -1.6],
    [2.6, 0.68, -1.2],
    [2.6, Y, -1.2],
    [2.6, Y, 0.9],
    [0.5, Y, 0.9],
  ],
  kitchen: [
    [0.5, Y, 0.9],
    [0.5, Y, 1.8],
    [-4.6, Y, 1.8],
    [-4.6, Y, 2.45],
  ],
  toilet: [
    [0.5, Y, 0.9],
    [0.5, Y, 2.3],
    [-1.5, Y, 2.3],
    [-1.5, Y, 2.85],
  ],
  floor: [
    [0.5, Y, 0.9],
    [0.5, Y, 2.3],
    [2.1, Y, 2.3],
    [2.1, Y, 2.95],
  ],
  washing: [
    [0.5, Y, 0.9],
    [0.5, Y, 1.8],
    [5.0, Y, 1.8],
    [5.0, Y, 2.45],
  ],
}

export const pipes = Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, run(v)])) as Record<
  keyof typeof runs,
  THREE.CurvePath<THREE.Vector3>
>

// Every corner gets a fitting; duplicates (shared corners) are merged.
export const joints: P[] = (() => {
  const seen = new Map<string, P>()
  for (const pts of Object.values(runs)) {
    for (let i = 1; i < pts.length; i++) seen.set(pts[i].map((n) => n.toFixed(2)).join(','), pts[i])
  }
  return [...seen.values()]
})()

// Day d on the forecast ribbon floating above the back of the plot.
export const railX = (d: number) => -6 + d * 1.2
export const RAIL_Z = -6.0
export const RAIL_Y = 2.5

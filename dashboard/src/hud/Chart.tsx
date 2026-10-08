import { remaining, type Household, type Plan } from '../model'
import type { Frame } from '../timeline'

const W = 440
const H = 228
const P = { l: 44, r: 16, t: 14, b: 34 }
const MAX_D = 10
const x = (d: number) => P.l + (Math.min(d, MAX_D) / MAX_D) * (W - P.l - P.r)

// Gridlines at round steps that fit the stored volume.
function ticks(max: number) {
  const step = [10, 20, 25, 50, 100, 150, 200].find((s) => max / s <= 5) ?? 250
  const out: number[] = []
  for (let v = 0; v <= max + 1e-6; v += step) out.push(v)
  return out
}

function path(plan: Plan, upTo: number, h: Household, y: (l: number) => number) {
  const pts: string[] = []
  for (let d = 0; d <= Math.min(upTo, MAX_D) + 1e-6; d += 0.05) pts.push(`${x(d).toFixed(1)},${y(remaining(plan, d, h)).toFixed(1)}`)
  return pts.length > 1 ? `M${pts.join('L')}` : ''
}

export function Chart({ f }: { f: Frame }) {
  const h = f.h
  const top = Math.max(h.stored, 1)
  const y = (l: number) => P.t + (1 - l / top) * (H - P.t - P.b)
  const redTo = f.redReveal * MAX_D
  const blueTo = f.blueReveal * MAX_D
  const delayed = !f.explore && f.rainDay > 7.02
  const ghost = Math.min(1, (f.rainDay - 7) / 2)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Freshwater remaining over the coming days, conventional use against BUFFER">
      {ticks(top).map((l) => (
        <g key={l}>
          <line x1={P.l} x2={W - P.r} y1={y(l)} y2={y(l)} className="grid" />
          <text x={P.l - 8} y={y(l) + 4} className="tick" textAnchor="end">
            {l}
          </text>
        </g>
      ))}
      {Array.from({ length: MAX_D + 1 }, (_, d) => (
        <text key={d} x={x(d)} y={H - P.b + 16} className="tick" textAnchor="middle">
          {d}
        </text>
      ))}
      <text x={W - P.r} y={H - 3} className="axis" textAnchor="end">
        Days
      </text>
      <text x={12} y={P.t + 2} className="axis" transform={`rotate(-90 12 ${P.t + 2})`} textAnchor="end">
        Freshwater remaining, L
      </text>

      <line x1={P.l} x2={W - P.r} y1={y(h.reserve)} y2={y(h.reserve)} className="reserve" />
      <text x={P.l + 6} y={y(h.reserve) + 13} className="reserve-label">
        Protected critical reserve
      </text>

      {delayed && (
        <line x1={x(7)} x2={x(7)} y1={P.t} y2={H - P.b} className="recharge ghost" style={{ opacity: 0.5 * ghost }} />
      )}
      <line x1={x(f.rainDay)} x2={x(f.rainDay)} y1={P.t} y2={H - P.b} className="recharge" />
      <text x={x(f.rainDay) - 6} y={P.t + 12} className="recharge-label" textAnchor="end">
        Expected recharge
      </text>

      {f.redReveal > 0 && <path d={path(f.conv, redTo, h, y)} className="line red" />}
      {f.redReveal > 0.98 && f.conv.runway <= MAX_D && (
        <g>
          <circle cx={x(f.conv.runway)} cy={y(0)} r={5} className="dot red" />
        </g>
      )}
      {f.blueReveal > 0 && <path d={path(f.plan, blueTo, h, y)} className="line blue" style={{ opacity: Math.min(1, f.blueReveal * 1.5) }} />}
    </svg>
  )
}

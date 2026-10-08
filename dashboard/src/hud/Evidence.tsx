import evidence from '../data/evidence.json'

// 34 real dry seasons from simulation/ (results/REPORT.md). Regenerate with
// `python -m buffer_sim.experiments` in simulation/.
const W = 440
const H = 150
const P = { l: 30, r: 8, t: 8, b: 22 }

type PerYear = Record<string, number>

export function Evidence() {
  const conv = evidence.per_year_shortage_days.conventional as PerYear
  const buf = evidence.per_year_shortage_days.buffer as PerYear
  const years = Object.keys(conv).map(Number).sort((a, b) => a - b)
  const max = Math.max(120, ...Object.values(conv))
  const slot = (W - P.l - P.r) / years.length
  const bw = Math.max(1.5, slot / 2 - 0.6)
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b)
  const c = evidence.base.conventional
  const b = evidence.base.buffer
  const imp = evidence.impact

  return (
    <div className="evidence">
      <ul className="proof">
        <li>
          <b>
            {c.mean_shortage_days} <span>→</span> {b.mean_shortage_days}
          </b>
          <span>days without drinking water per season</span>
        </li>
        <li>
          <b>
            {imp.seasons_without_shortage_buffer} of {b.years}
          </b>
          <span>seasons with no shortage, against {imp.seasons_without_shortage_conventional} today</span>
        </li>
        <li>
          <b>{Math.round((imp.alternative_share_saved_vs_static_rule ?? 0) * 100)}% less</b>
          <span>alternative water than a fixed switch-over rule</span>
        </li>
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart bars" role="img" aria-label="Shortage days in each of 34 dry seasons, conventional use against BUFFER">
        {[0, 40, 80, 120].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={P.l - 6} y={y(v) + 4} className="tick" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {years.map((yr, i) => {
          const x0 = P.l + i * slot + 0.6
          return (
            <g key={yr}>
              <rect x={x0} y={y(conv[yr])} width={bw} height={H - P.b - y(conv[yr])} className="bar red" />
              <rect x={x0 + bw + 0.4} y={y(buf[yr])} width={bw} height={Math.max(0, H - P.b - y(buf[yr]))} className="bar blue" />
            </g>
          )
        })}
        <text x={P.l} y={H - 6} className="tick">
          {years[0]}-{String(years[0] + 1).slice(2)}
        </text>
        <text x={W - P.r} y={H - 6} className="tick" textAnchor="end">
          {years[years.length - 1]}-{String(years[years.length - 1] + 1).slice(2)}
        </text>
        <text x={W / 2} y={H - 6} className="axis" textAnchor="middle">
          Shortage days per dry season
        </text>
      </svg>
      <p className="source">
        Simulated with daily NASA POWER rainfall for {evidence.site.name}, {evidence.household.people} people, {evidence.household.tank_l} L tank.
      </p>
    </div>
  )
}

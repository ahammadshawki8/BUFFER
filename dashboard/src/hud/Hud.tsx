import { clock, useClock, usePlaying } from '../clock'
import { endpoints, household, route, type Endpoint } from '../model'
import { DURATION, frame, lerp, steps, type Frame } from '../timeline'
import { Chart } from './Chart'

const record = new URLSearchParams(location.search).has('record')

export function Hud() {
  const t = useClock()
  const f = frame(t)
  return (
    <div className="hud">
      <Brand f={f} />
      <Stats f={f} />
      <Banners f={f} />
      <section className="panel forecast" aria-label="Forecast">
        <header>
          <h2>Ten-day forecast</h2>
          <p>Day 0 starts with {household.stored} L of stored rainwater</p>
          <ul className="legend">
            <li className="red" style={{ opacity: f.redReveal > 0 ? 1 : 0.35 }}>
              Conventional use
            </li>
            <li className="blue" style={{ opacity: f.blueReveal > 0 ? 1 : 0.35 }}>
              BUFFER
            </li>
          </ul>
        </header>
        <Chart f={f} />
      </section>
      <Routing f={f} />
      <StepTrack f={f} />
      <Outcome f={f} />
      {!record && <Transport t={t} />}
    </div>
  )
}

function Brand({ f }: { f: Frame }) {
  return (
    <div className="brand">
      <div className="wordmark">
        <svg viewBox="0 0 28 32" aria-hidden="true">
          <rect x="10" y="0.8" width="8" height="3.4" rx="1.3" className="cap" />
          <rect x="3.2" y="5" width="21.6" height="25.6" rx="5.6" className="cell" />
          <rect x="6.4" y="14.2" width="15.2" height="13.2" rx="2.6" className="water" />
          <line x1="9" y1="22.6" x2="19" y2="22.6" className="reserve" />
        </svg>
        BUFFER
      </div>
      <p>Freshwater reserve controller</p>
      <ul className="chips">
        <li>{household.people} people</li>
        <li>Dry season, day 0</li>
        <li className="live">
          <i /> Controller online
        </li>
        {f.bufferOn && <li className="auto">Automatic routing</li>}
      </ul>
    </div>
  )
}

function Stats({ f }: { f: Frame }) {
  const runway = lerp(f.conv.runway, f.plan.runway, f.bufferBlend)
  const short = f.rainDay - runway
  const mode = f.bufferOn ? f.plan.mode : 'NORMAL'
  const delayed = f.rainDay > 7.5
  return (
    <div className="stats">
      <div className={`plate runway ${short > 0.05 ? 'is-short' : 'is-ok'}`}>
        <h3>Freshwater runway</h3>
        <div className="big">
          {runway.toFixed(1)}
          <small>days</small>
        </div>
        <p>{short > 0.05 ? `${short.toFixed(1)} days short of the next rain` : f.bufferOn ? 'Critical reserve protected' : 'Lasts until the next rain'}</p>
      </div>
      <div className="plate recharge">
        <h3>Next reliable recharge</h3>
        <div className="mid">
          Day {f.rainDay.toFixed(0)}
        </div>
        <p className={delayed ? 'warn' : ''}>{delayed ? 'Delayed by 2 days' : 'Seasonal rain forecast'}</p>
      </div>
      <div className={`plate mode is-${mode.toLowerCase()}`}>
        <h3>BUFFER mode</h3>
        <div className="pill">{mode}</div>
        <p>
          {!f.bufferOn
            ? 'Every use draws freshwater'
            : f.plan.strict
              ? 'Freshwater for drinking and cooking only'
              : 'Flexible uses moved to alternative'}
        </p>
      </div>
    </div>
  )
}

function Banners({ f }: { f: Frame }) {
  return (
    <div className="banners" aria-live="polite">
      {f.warning > 0 && (
        <div className="banner risk" style={{ opacity: f.warning }}>
          <b>Critical freshwater shortage predicted before next recharge.</b>
          <span>At 50 L a day the tank is empty on day 4.0. Rain is due on day 7.</span>
        </div>
      )}
      {f.delayToast > 0 && (
        <div className="banner risk" style={{ opacity: f.delayToast }}>
          <b>Recharge delayed by 2 days. Shortage risk increased.</b>
          <span>New forecast: reliable rain on day 9. BUFFER is replanning.</span>
        </div>
      )}
      {f.tightenToast > 0 && (
        <div className="banner fresh" style={{ opacity: f.tightenToast }}>
          <b>Allocation tightened.</b>
          <span>Freshwater hygiene allowance cut from 5.7 to 0 L a day. Drinking and cooking stay fully served.</span>
        </div>
      )}
    </div>
  )
}

function Routing({ f }: { f: Frame }) {
  const r = f.request
  const flow = (on: boolean) => (on ? (0.82 + Math.sin(f.t * 7) * 0.03).toFixed(2) : '0.00')
  return (
    <section className="panel routing" aria-label="Source routing">
      <header>
        <h2>Source routing</h2>
        <p>{f.bufferOn ? 'Assigned by use priority' : 'All uses share one tank'}</p>
      </header>
      <ul className="uses">
        {(Object.keys(endpoints) as Endpoint[]).map((e) => {
          const src = route(e, f.bufferOn)
          const active = r?.endpoint === e
          return (
            <li key={e} className={active ? 'is-active' : ''}>
              <span className="use">
                {endpoints[e].name}
                <em>{endpoints[e].critical ? 'Critical' : 'Flexible'}</em>
              </span>
              <span className={`src is-${src}`}>{src === 'fresh' ? 'Freshwater' : 'Alternative'}</span>
            </li>
          )
        })}
      </ul>
      <div className="valves">
        <div className={`valve ${f.valveA ? 'is-open is-fresh' : ''}`}>
          <b>Valve A</b>
          <span>{f.valveA ? 'Open' : 'Closed'}</span>
          <small>Flow A {flow(f.valveA)} L/min</small>
        </div>
        <div className={`valve ${f.valveB ? 'is-open is-alt' : ''}`}>
          <b>Valve B</b>
          <span>{f.valveB ? 'Open' : 'Closed'}</span>
          <small>Flow B {flow(f.valveB)} L/min</small>
        </div>
      </div>
      <dl className="budget">
        <div>
          <dt>Freshwater draw</dt>
          <dd>{lerp(f.conv.draw, f.plan.draw, f.bufferBlend).toFixed(1)} L/day</dd>
        </div>
        <div>
          <dt>Hygiene allowance</dt>
          <dd>{f.bufferOn ? `${f.plan.allowance.toFixed(1)} L/day` : 'Unlimited'}</dd>
        </div>
      </dl>
    </section>
  )
}

function StepTrack({ f }: { f: Frame }) {
  const s = steps[f.step]
  return (
    <nav className="steps" aria-label="Scenario steps">
      <ol>
        {steps.map((st, i) => (
          <li key={i} className={i < f.step ? 'done' : i === f.step ? 'now' : ''}>
            <button onClick={() => clock.set(st.at + 0.01)} aria-current={i === f.step ? 'step' : undefined}>
              <span className="n">{i + 1}</span>
              <span className="label">{st.title}</span>
              {i === f.step && <span className="bar" style={{ transform: `scaleX(${f.stepProgress})` }} />}
            </button>
          </li>
        ))}
      </ol>
      <p className="caption">{s.text}</p>
    </nav>
  )
}

function Outcome({ f }: { f: Frame }) {
  if (f.outcome <= 0) return null
  return (
    <div className="outcome" style={{ opacity: f.outcome }}>
      <div className="outcome-card" style={{ transform: `translateY(${(1 - f.outcome) * 16}px)` }}>
        <h2>Same stored water. Different outcome.</h2>
        <div className="versus">
          <div className="side without">
            <h3>Without BUFFER</h3>
            <p className="verdict">Critical freshwater depleted on day {f.conv.runway.toFixed(1)}</p>
            <Meter runway={f.conv.runway} rain={9} tone="red" />
            <p className="note">5 days without drinking water before the rain on day 9</p>
          </div>
          <div className="side with">
            <h3>With BUFFER</h3>
            <p className="verdict">Critical freshwater survives until recharge</p>
            <Meter runway={9} rain={9} tone="blue" />
            <p className="note">Rain arrives on day 9 with the 20 L reserve still in the tank</p>
          </div>
        </div>
        <p className="moral">
          BUFFER does not create more water. It treats freshwater like a battery: it protects the critical reserve before
          the household reaches zero.
        </p>
      </div>
    </div>
  )
}

function Meter({ runway, rain, tone }: { runway: number; rain: number; tone: 'red' | 'blue' }) {
  return (
    <div className="meter" aria-hidden="true">
      <span className={`fill ${tone}`} style={{ width: `${(Math.min(runway, rain) / 10) * 100}%` }} />
      {runway < rain && <span className="gap" style={{ left: `${(runway / 10) * 100}%`, width: `${((rain - runway) / 10) * 100}%` }} />}
      <span className="rain" style={{ left: `${(rain / 10) * 100}%` }} />
      <span className="scale">
        <i>Day 0</i>
        <i>Day 10</i>
      </span>
    </div>
  )
}

function Transport({ t }: { t: number }) {
  const playing = usePlaying()
  return (
    <div className="transport">
      <button onClick={() => clock.toggle()} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <input
        type="range"
        min={0}
        max={DURATION}
        step={0.05}
        value={t}
        onChange={(e) => clock.set(Number(e.target.value))}
        aria-label="Timeline"
      />
      <output>{t.toFixed(1)} s</output>
      {!playing && <span className="hint">Drag to rotate, scroll to zoom, right-drag to move</span>}
    </div>
  )
}

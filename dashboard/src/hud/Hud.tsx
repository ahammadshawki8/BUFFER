import { useState } from 'react'
import { app, defaultScenario, useApp, type Scenario } from '../app'
import { clock, setExplore, useClock, usePlaying } from '../clock'
import { endpoints, route, type Endpoint } from '../model'
import { DURATION, frame, lerp, steps, type Frame } from '../timeline'
import evidence from '../data/evidence.json'
import { Chart } from './Chart'
import { Evidence } from './Evidence'

const record = new URLSearchParams(location.search).has('record')

export function Hud() {
  const t = useClock()
  useApp()
  const f = frame(t)
  return (
    <div className="hud">
      <Brand f={f} />
      <Stats f={f} />
      <Banners f={f} />
      <Forecast f={f} />
      <Routing f={f} />
      {f.explore ? <ExploreControls /> : <StepTrack f={f} />}
      <Outcome f={f} />
      {!record && <ModeSwitch explore={f.explore} />}
      {!record && !f.explore && <Transport t={t} />}
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
        <li>{f.h.people} people</li>
        <li>Dry season, day 0</li>
        <li className="live">
          <i /> Controller online
        </li>
        {f.bufferOn && <li className="auto">Automatic routing</li>}
      </ul>
    </div>
  )
}

function ModeSwitch({ explore }: { explore: boolean }) {
  return (
    <div className="mode-switch" role="group" aria-label="View">
      <button aria-pressed={!explore} onClick={() => explore && setExplore(false)}>
        Guided demo
      </button>
      <button aria-pressed={explore} onClick={() => !explore && setExplore(true)}>
        Explore
      </button>
    </div>
  )
}

function Stats({ f }: { f: Frame }) {
  const runway = lerp(f.conv.runway, f.plan.runway, f.bufferBlend)
  const short = f.rainDay - runway
  const mode = f.bufferOn ? f.plan.mode : 'NORMAL'
  const delayed = !f.explore && f.rainDay > 7.5
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
        <div className="mid">Day {f.rainDay.toFixed(0)}</div>
        <p className={delayed ? 'warn' : ''}>{delayed ? 'Delayed by 2 days' : 'Seasonal rain forecast'}</p>
      </div>
      <div className={`plate mode is-${mode.toLowerCase()}`}>
        <h3>BUFFER mode</h3>
        <div className="pill">{f.explore && !f.bufferOn ? 'OFF' : mode}</div>
        <p>
          {!f.bufferOn
            ? 'Every use draws freshwater'
            : mode === 'CRITICAL'
              ? 'Drinking water alone will not last'
              : mode === 'NORMAL'
                ? 'Enough freshwater for every use'
                : f.plan.strict
                  ? 'Freshwater for drinking and cooking only'
                  : f.altAvailable
                    ? 'Flexible uses moved to alternative'
                    : 'Flexible use limited to save freshwater'}
        </p>
      </div>
    </div>
  )
}

function Banners({ f }: { f: Frame }) {
  const c = f.conv
  return (
    <div className="banners" aria-live="polite">
      {f.warning > 0 && (
        <div className="banner risk" style={{ opacity: f.warning }}>
          <b>Critical freshwater shortage predicted before next recharge.</b>
          <span>
            At {c.draw.toFixed(0)} L a day the tank is empty on day {c.runway.toFixed(1)}. Rain is due on day {f.rainDay.toFixed(0)}.
          </span>
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
          <span>Flexible-use allowance cut from 5.7 to 0 L a day. Drinking and cooking stay fully served.</span>
        </div>
      )}
      {f.explore && f.bufferOn && f.plan.mode === 'CRITICAL' && (
        <div className="banner risk">
          <b>Not enough freshwater for drinking and cooking until rain.</b>
          <span>
            Even with every flexible use moved, the reserve lasts {f.plan.runway.toFixed(1)} days. The household needs more storage or another safe drinking source.
          </span>
        </div>
      )}
      {f.explore && f.bufferOn && f.plan.rationed > 0.05 && f.plan.mode !== 'CRITICAL' && (
        <div className="banner fresh">
          <b>No alternative source available.</b>
          <span>
            {f.plan.rationed.toFixed(1)} L a day of flexible use goes unserved so drinking water lasts until day {f.rainDay.toFixed(0)}.
          </span>
        </div>
      )}
    </div>
  )
}

function Forecast({ f }: { f: Frame }) {
  const [tab, setTab] = useState<'forecast' | 'evidence'>('forecast')
  return (
    <section className="panel forecast" aria-label="Forecast and evidence">
      <header>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'forecast'} onClick={() => setTab('forecast')}>
            Ten-day forecast
          </button>
          <button role="tab" aria-selected={tab === 'evidence'} onClick={() => setTab('evidence')}>
            Tested on real rainfall
          </button>
        </div>
        {tab === 'forecast' ? (
          <>
            <p>Day 0 starts with {f.h.stored} L of stored rainwater</p>
            <ul className="legend">
              <li className="red" style={{ opacity: f.redReveal > 0 ? 1 : 0.35 }}>
                Conventional use
              </li>
              <li className="blue" style={{ opacity: f.blueReveal > 0 ? 1 : 0.35 }}>
                BUFFER
              </li>
            </ul>
          </>
        ) : (
          <p>34 dry seasons, {evidence.site.name.split(',')[0]}, 1991 to 2025</p>
        )}
      </header>
      {tab === 'forecast' ? <Chart f={f} /> : <Evidence />}
    </section>
  )
}

function Routing({ f }: { f: Frame }) {
  const r = f.request
  const flow = (on: boolean) => (on ? (0.82 + Math.sin(f.t * 7) * 0.03).toFixed(2) : '0.00')
  return (
    <section className="panel routing" aria-label="Source routing">
      <header>
        <h2>Source routing</h2>
        <p>{!f.bufferOn ? 'All uses share one tank' : f.altAvailable ? 'Assigned by use priority' : 'Alternative source unavailable'}</p>
      </header>
      <ul className="uses">
        {(Object.keys(endpoints) as Endpoint[]).map((e) => {
          const src = route(e, f.bufferOn, f.altAvailable)
          const limited = f.bufferOn && !f.altAvailable && !endpoints[e].critical
          const active = r?.endpoint === e
          return (
            <li key={e} className={active ? 'is-active' : ''}>
              <span className="use">
                {endpoints[e].name}
                <em>{endpoints[e].critical ? 'Critical' : 'Flexible'}</em>
              </span>
              <span className={`src is-${src}`}>{src === 'alt' ? 'Alternative' : limited ? 'Freshwater, limited' : 'Freshwater'}</span>
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
          <dt>Flexible-use allowance</dt>
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

const sliders: { key: keyof Scenario; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: 'people', label: 'People', min: 1, max: 10, step: 1, unit: '' },
  { key: 'stored', label: 'Freshwater stored', min: 50, max: 600, step: 10, unit: 'L' },
  { key: 'criticalLpcd', label: 'Drinking and cooking', min: 2, max: 8, step: 0.5, unit: 'L/person' },
  { key: 'flexibleLpcd', label: 'Flexible use', min: 0, max: 15, step: 0.5, unit: 'L/person' },
  { key: 'rainDay', label: 'Next reliable rain', min: 1, max: 10, step: 1, unit: '' },
  { key: 'reserveDays', label: 'Protected reserve', min: 0, max: 3, step: 0.5, unit: 'days' },
]

function label(key: keyof Scenario, v: number, unit: string) {
  if (key === 'rainDay') return `Day ${v}`
  if (unit === 'days') return `${v} ${v === 1 ? 'day' : 'days'}`
  return `${v} ${unit}`.trim()
}

function update(patch: Partial<Scenario>) {
  if ('bufferOn' in patch && patch.bufferOn !== app.scenario.bufferOn) app.bufferChangedAt = clock.t
  app.scenario = { ...app.scenario, ...patch }
  app.emit()
}

function ExploreControls() {
  const s = app.scenario
  return (
    <section className="steps explore" aria-label="Explore the model">
      <div className="sliders">
        {sliders.map((sl) => (
          <label key={sl.key}>
            <span className="row">
              <span>{sl.label}</span>
              <output>{label(sl.key, s[sl.key] as number, sl.unit)}</output>
            </span>
            <input
              type="range"
              min={sl.min}
              max={sl.max}
              step={sl.step}
              value={s[sl.key] as number}
              onChange={(e) => update({ [sl.key]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
      <div className="actions">
        <label className="toggle">
          <input type="checkbox" checked={s.bufferOn} onChange={(e) => update({ bufferOn: e.target.checked })} />
          BUFFER control
        </label>
        <label className="toggle">
          <input type="checkbox" checked={s.altAvailable} onChange={(e) => update({ altAvailable: e.target.checked })} />
          Alternative source available
        </label>
        <span className="divider" />
        <span className="hint-inline">Request water for</span>
        {(Object.keys(endpoints) as Endpoint[]).map((e) => (
          <button
            key={e}
            className="use-btn"
            onClick={() => {
              app.request = { endpoint: e, at: clock.t }
              app.emit()
            }}
          >
            {endpoints[e].name}
          </button>
        ))}
        <button className="reset" onClick={() => update({ ...defaultScenario })}>
          Reset
        </button>
      </div>
    </section>
  )
}

function Outcome({ f }: { f: Frame }) {
  if (f.outcome <= 0) return null
  const c = evidence.base.conventional
  const b = evidence.base.buffer
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
        <p className="tested">
          Tested on {c.years} real dry seasons in Koyra: a household with a 3,000 L tank ran short for {c.mean_shortage_days} days a season with
          conventional use, and {b.mean_shortage_days} with BUFFER.
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
        value={Math.min(t, DURATION)}
        onChange={(e) => clock.set(Number(e.target.value))}
        aria-label="Timeline"
      />
      <output>{Math.min(t, DURATION).toFixed(1)} s</output>
      {!playing && <span className="hint">Drag to rotate, scroll to zoom, right-drag to move</span>}
    </div>
  )
}

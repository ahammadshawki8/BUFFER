// Feeds controller telemetry into Live rig mode and checks the commands sent back.
// node tools/live-check.mjs <outDir>   (needs the preview server on :5173)
import { chromium } from 'playwright'
const out = process.argv[2]
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto('http://localhost:5173/?autoplay=0')
await p.waitForTimeout(2500)
const base = { t: 1000, fresh_l: 186.4, alt_l: 151, cap_l: 200, sensor_ok: 1, alt_ok: 1, rain_days: 7, mode: 'PRESERVE', strict: 0, runway: 6.48, gap: 0.52,
  allowance: 3.77, draw: 23.77, conv_runway: 3.73, flex_used: 1.2, valve_a: 0, valve_b: 1, flow_a: 0, flow_b: 0.82, request: 'toilet', source: 'alt',
  override: 0, critical: 20, flexible: 30, reserve: 20, event: 'open:toilet:alt' }
await p.evaluate((t) => window.__bufferLive.inject(t), base)
await p.waitForTimeout(1800)
await p.screenshot({ path: `${out}/live_preserve.png` })
await p.getByRole('button', { name: 'Floor cleaning' }).last().click()
await p.locator('.live-dock input[type=range]').fill('9')
await p.evaluate((t) => window.__bufferLive.inject(t), { ...base, sensor_ok: 0, mode: 'FAULT', request: 'none', source: 'none', valve_b: 0, event: 'done:toilet' })
await p.waitForTimeout(800)
await p.screenshot({ path: `${out}/live_fault.png` })
console.log('sent:', JSON.stringify(await p.evaluate(() => window.__bufferLive.sent)))
console.log('page errors:', errs)
// explore override
await p.getByRole('button', { name: 'Explore' }).click()
await p.waitForTimeout(500)
await p.getByLabel('Household override').check()
await p.waitForTimeout(600)
await p.screenshot({ path: `${out}/explore_override.png` })
await b.close()

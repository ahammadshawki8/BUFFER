// Drives explore mode and saves screenshots: node tools/explore-check.mjs <outDir>
import { chromium } from 'playwright'
const out = process.argv[2]
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto('http://localhost:5173/?autoplay=0')
await p.waitForTimeout(3000)
await p.getByRole('button', { name: 'Explore' }).click()
await p.waitForTimeout(800)
await p.getByRole('button', { name: 'Toilet' }).click()
await p.waitForTimeout(1500)
await p.screenshot({ path: `${out}/explore_default.png` })
// rain later than the tank can cover even for drinking: CRITICAL
const rain = p.locator('.sliders input').nth(4)
await rain.fill('10')
const stored = p.locator('.sliders input').nth(1)
await stored.fill('150')
await p.getByLabel('Alternative source available').uncheck()
await p.getByRole('button', { name: 'Drinking & cooking' }).click()
await p.waitForTimeout(1500)
await p.screenshot({ path: `${out}/explore_critical.png` })
await p.getByRole('button', { name: 'Reset' }).click()
await p.getByRole('tab', { name: 'Tested on real rainfall' }).click()
await p.waitForTimeout(600)
await p.screenshot({ path: `${out}/explore_evidence.png` })
console.log('page errors:', errs)
await b.close()

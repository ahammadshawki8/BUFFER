// Captures the intro over time and checks card minimise/restore: node tools/intro-check.mjs <outDir>
import { chromium } from 'playwright'
const out = process.argv[2]
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto('http://localhost:5173/?intro')
const start = Date.now()
for (const at of [400, 1100, 1700, 2300, 2900, 3600]) {
  await p.waitForTimeout(Math.max(0, at - (Date.now() - start)))
  await p.screenshot({ path: `${out}/intro_${at}.png`, clip: { x: 560, y: 260, width: 800, height: 560 } })
}
await p.waitForTimeout(1500)
console.log('intro gone:', (await p.locator('.intro').count()) === 0)
await p.getByRole('button', { name: 'Minimise Forecast and evidence' }).click()
await p.getByRole('button', { name: 'Minimise Source routing' }).click()
await p.waitForTimeout(700)
await p.screenshot({ path: `${out}/cards_closed.png` })
await p.getByRole('button', { name: 'Open Source routing' }).click({ force: true })
await p.waitForTimeout(500)
console.log('routing restored:', (await p.locator('section.routing').count()) === 1)
await p.reload()
await p.waitForTimeout(2500)
console.log('intro skipped on second visit:', (await p.locator('.intro').count()) === 0, '| forecast still minimised:', (await p.locator('.card-fab.forecast').count()) === 1)
console.log('page errors:', errs)
await b.close()

// Usage: node tools/shots.mjs <outDir> t1 t2 ...   (needs `npx vite preview --port 4173` running)
import { chromium } from 'playwright'
const [out, ...times] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()))
await page.goto('http://localhost:5173/?capture&record')
await page.waitForTimeout(2500)
for (const t of times) {
  await page.evaluate((t) => window.__buffer.setTime(Number(t)), t)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/t${String(t).padStart(5, '0')}.png` })
}
await browser.close()

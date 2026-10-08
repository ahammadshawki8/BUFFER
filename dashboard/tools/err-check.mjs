import { chromium } from 'playwright'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
let n = 0; p.on('console', m => m.type()==='error' && n++)
await p.goto('http://localhost:5173/?t=0&autoplay=0'); await p.waitForTimeout(3000)
console.log('after load:', n)
for (const t of [5, 10, 19, 25, 31, 39, 44]) { await p.evaluate(t => window.__buffer.setTime(t), t); await p.waitForTimeout(300) }
console.log('after scrubbing:', n)
await b.close()

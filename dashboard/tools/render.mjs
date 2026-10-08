// Renders the dashboard timeline to video, one exact frame at a time.
// Usage: node tools/render.mjs <from s> <to s> <out.mp4> [fps=30]
// Needs the dev server on :5173.
import { chromium } from 'playwright'
import { mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'

const [from, to, out, fpsArg] = process.argv.slice(2)
const fps = Number(fpsArg ?? 30)
const frames = Math.round((Number(to) - Number(from)) * fps)
const tmp = join(dirname(out), `_frames_${Date.now()}`)
mkdirSync(tmp, { recursive: true })

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto('http://localhost:5173/?capture&record')
await page.waitForTimeout(4000)
const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
await page.evaluate((t) => window.__buffer.setTime(t), Number(from))
await settle()
await page.waitForTimeout(500)
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.__buffer.setTime(t), Number(from) + i / fps)
  await settle()
  await page.screenshot({ path: join(tmp, `f${String(i).padStart(5, '0')}.png`) })
  if (i % 60 === 0) console.log(`frame ${i}/${frames}`)
}
await browser.close()
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', join(tmp, 'f%05d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out])
rmSync(tmp, { recursive: true, force: true })
console.log('wrote', out)

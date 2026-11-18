# BUFFER dashboard

3D digital twin of a BUFFER household: freshwater tank, alternative source, valves, and the four household uses.
It runs the same planning and routing rules as the controller (`src/model.ts`, mirroring `firmware/lib/buffer_core`).

| View | What it does |
|---|---|
| **Guided demo** | Scripted 45-second story (`src/timeline.ts`). Conventional use runs dry on day 4.0; BUFFER switches to Preserve, routes flexible uses to valve B and holds to day 7.0, then 9.0 after the rain is delayed. Space pauses; the 3D model can be orbited. |
| **Explore** | Runs the model on your own scenario: people, stored litres, demand, reserve, next reliable rain, alternative source on/off, household override and advice-only mode. |
| **Live device** | Mirrors an ESP32 controller over Web Serial (Chrome or Edge), using the protocol in [`hardware/serial-protocol.md`](../hardware/serial-protocol.md). |

The demo household (5 people, 200 L, rain on day 7) is illustrative. Season-scale results come from the simulation:
[`simulation/results/REPORT.md`](../simulation/results/REPORT.md).

## Run

Needs Node.js 20.19+ or 22.12+ (Vite 8).

```
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check and production build into dist/
npm run lint
```

## URL options

| Parameter | Effect |
|---|---|
| `?explore` | Open in Explore mode |
| `?t=22&autoplay=0` | Start the guided demo paused at 22 s |
| `?intro` | Replay the first-visit brand intro |
| `?record` | Hide the mode switch and transport (clean screen recordings) |
| `?capture` | Freeze the clock so frames can be set from outside (`window.__buffer.setTime(t)`) |

## Scripted checks and video tools

All need the dev server on :5173 and Playwright (`npx playwright install chromium` once).

| Script | Purpose |
|---|---|
| `node tools/render.mjs <from> <to> <out.mp4> [fps]` | Render the guided demo to video, one exact frame at a time (needs ffmpeg) |
| `node tools/shots.mjs <dir> t1 t2 ...` | Screenshots of the guided demo at given times |
| `node tools/explore-check.mjs <dir>` | Drives Explore mode |
| `node tools/live-check.mjs <dir>` | Feeds controller telemetry into Live device mode and checks the commands sent back |
| `node tools/drag-check.mjs <dir>` | Floating-card dragging, clamping and persistence |
| `node tools/intro-check.mjs <dir>` | Brand intro and card minimise/restore |
| `node tools/err-check.mjs`, `node tools/orbit-check.mjs` | Console errors; camera orbit |

// Live rig link: reads the ESP32's JSON telemetry over Web Serial (Chrome/Edge)
// and sends commands back. Protocol: hardware/serial-protocol.md
import { app, type Telemetry } from './app'
import { clock } from './clock'

// Minimal Web Serial typings, so the app does not need extra type packages.
interface SerialPortLike {
  open(o: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
}
type NavigatorSerial = Navigator & { serial?: { requestPort(): Promise<SerialPortLike> } }

let port: SerialPortLike | null = null
let reader: ReadableStreamDefaultReader<string> | null = null

export function serialSupported() {
  return 'serial' in navigator
}

export function receive(t: Telemetry) {
  const prev = app.live.telemetry
  if (t.request !== 'none' && (!prev || prev.request !== t.request)) app.live.requestSeenAt = clock.t
  app.live.telemetry = t
  app.emit()
}

export function startLive() {
  app.live.on = true
  app.explore = true // live view shares explore's free-running clock and free camera
  clock.playing = false
  app.emit()
}

export function stopLive() {
  app.live.on = false
  app.live.send = null
  app.live.status = 'idle'
  reader?.cancel().catch(() => {})
  port?.close().catch(() => {})
  port = null
  app.emit()
}

export async function connect() {
  const serial = (navigator as NavigatorSerial).serial
  if (!serial) {
    app.live.status = 'error'
    app.live.message = 'This browser cannot open USB serial ports. Use Chrome or Edge on a computer.'
    app.emit()
    return
  }
  try {
    app.live.status = 'connecting'
    app.emit()
    port = await serial.requestPort()
    await port.open({ baudRate: 115200 })
    const encoder = new TextEncoder()
    const writer = port.writable!.getWriter()
    app.live.send = (cmd) => {
      writer.write(encoder.encode(JSON.stringify(cmd) + '\n')).catch(() => {})
    }
    app.live.status = 'connected'
    app.live.message = ''
    app.emit()
    reader = port.readable!.pipeThrough(new TextDecoderStream() as unknown as ReadableWritablePair<string, Uint8Array>).getReader()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      let nl
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (line.startsWith('{')) {
          try {
            receive(JSON.parse(line) as Telemetry)
          } catch {
            // a partial line at connect time; the next one is complete
          }
        }
      }
    }
  } catch (e) {
    app.live.status = 'error'
    app.live.message = e instanceof Error && e.name === 'NotFoundError' ? 'No port was chosen.' : 'The controller disconnected.'
    app.live.send = null
    app.emit()
  }
}

declare global {
  interface Window {
    __bufferLive: { inject: (t: Telemetry) => void; sent: object[] }
  }
}

// Test hook: feed telemetry without hardware and record what the dashboard sends.
const sent: object[] = []
window.__bufferLive = {
  inject: (t) => {
    if (!app.live.on) startLive()
    app.live.status = 'connected'
    if (!app.live.send) app.live.send = (cmd) => sent.push(cmd)
    receive(t)
  },
  sent,
}

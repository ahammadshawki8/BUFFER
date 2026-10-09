import { useCallback, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { app } from './app'
import { clock } from './clock'
import { Intro, shouldPlayIntro } from './hud/Intro'
import { Scene } from './scene/Scene'
import { Hud } from './hud/Hud'

export default function App() {
  // Live viewing starts at 1.5x pixel density and drops to 1x if the GPU struggles;
  // frame capture always renders at full quality.
  const [dpr, setDpr] = useState(clock.capture ? 2 : 1.5)
  // The guided demo waits behind the intro and starts the moment it ends.
  const [intro, setIntro] = useState(() => {
    const play = shouldPlayIntro()
    if (play) clock.playing = false
    return play
  })
  const endIntro = useCallback(() => {
    setIntro(false)
    if (!app.explore && new URLSearchParams(location.search).get('autoplay') !== '0') {
      clock.playing = true
      clock.set(clock.t)
    }
  }, [])
  return (
    <main className="app">
      <Canvas className="stage" orthographic shadows flat dpr={dpr} gl={{ antialias: false, powerPreference: 'high-performance' }} camera={{ position: [20, 21, 22], zoom: 60, near: 0.1, far: 200 }}>
        {!clock.capture && <PerformanceMonitor onDecline={() => setDpr(1)} />}
        <Scene />
      </Canvas>
      <Hud />
      {intro && <Intro onDone={endIntro} />}
    </main>
  )
}

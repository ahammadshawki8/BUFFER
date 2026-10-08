import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, OrbitControls, RoundedBox, SoftShadows } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { clock, useClock, usePlaying } from '../clock'
import { frame, flowSeconds, smooth, lerp, type Frame } from '../timeline'
import { endpoints, type Endpoint, type Source } from '../model'
import { joints, layout, pipes, railX, run, RAIL_Y, RAIL_Z } from './pipes'

// Maquette palette: everything is clay and concrete; colour is reserved for water and state.
const C = {
  clay: '#F2F2EF',
  clayShade: '#E1E3E0',
  baseTop: '#EAEDEB',
  baseSide: '#CBD4D5',
  baseDeep: '#B9C4C6',
  paving: '#DEE3E0',
  concrete: '#D2D6D3',
  sage: '#86B86B',
  sageDeep: '#5E9A4F',
  lawn: '#B5D69C',
  trunk: '#BCB2A5',
  metal: '#A8B1B5',
  pvc: '#B3BCC0',
  ink: '#17313B',
  coil: '#262D31',
  brass: '#C9A44F',
  terracotta: '#C98A6C',
  fresh: '#2F7ED8',
  alt: '#C98B2B',
  altWater: '#BD8C45',
  risk: '#D2483C',
}

const sourceColor: Record<Source, string> = { fresh: C.fresh, alt: C.alt }

/* ---------- materials ---------- */

const mats = {
  clay: new THREE.MeshStandardMaterial({ color: C.clay, roughness: 0.92 }),
  clayShade: new THREE.MeshStandardMaterial({ color: C.clayShade, roughness: 0.92 }),
  concrete: new THREE.MeshStandardMaterial({ color: C.concrete, roughness: 0.95 }),
  sage: new THREE.MeshStandardMaterial({ color: C.sage, roughness: 0.9 }),
  sageDeep: new THREE.MeshStandardMaterial({ color: C.sageDeep, roughness: 0.9 }),
  lawn: new THREE.MeshStandardMaterial({ color: C.lawn, roughness: 0.95 }),
  trunk: new THREE.MeshStandardMaterial({ color: C.trunk, roughness: 0.9 }),
  metal: new THREE.MeshStandardMaterial({ color: C.metal, metalness: 0.75, roughness: 0.32 }),
  pvc: new THREE.MeshStandardMaterial({ color: C.pvc, roughness: 0.5 }),
  brass: new THREE.MeshStandardMaterial({ color: C.brass, metalness: 0.85, roughness: 0.28 }),
  coil: new THREE.MeshStandardMaterial({ color: C.coil, roughness: 0.55 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transmission: 1,
    thickness: 0.25,
    roughness: 0.06,
    ior: 1.4,
    transparent: true,
    opacity: 1,
  }),
  tubing: new THREE.MeshPhysicalMaterial({
    color: '#BFD3DC',
    transmission: 0.5,
    thickness: 0.25,
    roughness: 0.16,
    ior: 1.4,
    clearcoat: 0.6,
  }),
  window: new THREE.MeshStandardMaterial({ color: '#7E95A0', metalness: 0.3, roughness: 0.25 }),
}

/* ---------- camera: keyed shots, interpolated from t ---------- */

const shots = [
  { at: 0, target: [0.4, -0.6], zoom: 1.0, az: 0.74 },
  { at: 8, target: [-0.2, 0.6], zoom: 1.08, az: 0.7 },
  { at: 18, target: [0.4, 0.2], zoom: 1.05, az: 0.76 },
  { at: 20.5, target: [0.6, 0.6], zoom: 1.2, az: 0.8 },
  { at: 30, target: [0.4, -2.4], zoom: 1.1, az: 0.72 },
  { at: 38, target: [0.4, -0.4], zoom: 0.96, az: 0.76 },
] as const

// Where the scripted camera is looking; shared with the free camera.
const rigTarget = new THREE.Vector3()
const HQ = clock.capture

function scripted(t: number, aspectZoom: number, pos: THREE.Vector3) {
  let i = 0
  for (let k = 0; k < shots.length; k++) if (t >= shots[k].at) i = k
  const a = shots[Math.max(0, i - 1)]
  const b = shots[i]
  const k = i === 0 ? 1 : smooth(b.at, b.at + 1.8, t)
  rigTarget.set(lerp(a.target[0], b.target[0], k) + 1.25, 0, lerp(a.target[1], b.target[1], k) - 1.05)
  const az = lerp(a.az, b.az, k) + Math.sin(t * 0.21) * 0.022
  const zoom = lerp(a.zoom, b.zoom, k) * (1 + Math.sin(t * 0.33) * 0.006)
  const r = 30
  pos.set(rigTarget.x + Math.sin(az) * r, 21, rigTarget.z + Math.cos(az) * r)
  return aspectZoom * 61 * zoom
}

// Plays the scripted camera; while paused, hands the camera to the viewer.
// On resume it eases back from wherever the viewer left it.
function CameraRig() {
  const { camera, size } = useThree()
  const playing = usePlaying()
  const controls = useRef<OrbitControlsImpl>(null)
  const pos = useMemo(() => new THREE.Vector3(), [])
  const from = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; zoom: number; at: number } | null>(null)
  const look = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    if (!playing && controls.current) {
      controls.current.target.copy(rigTarget)
      controls.current.update()
    }
    if (playing && controls.current) {
      from.current = { pos: cam.position.clone(), target: controls.current.target.clone(), zoom: cam.zoom, at: performance.now() }
    }
  }, [playing, camera])

  useFrame(() => {
    if (!clock.playing && !clock.capture) return
    const cam = camera as THREE.OrthographicCamera
    const zoom = scripted(clock.t, size.height / 1080, pos)
    look.copy(rigTarget)
    const f = from.current
    if (f && !HQ) {
      const k = smooth(0, 1, (performance.now() - f.at) / 1100)
      pos.lerpVectors(f.pos, pos, k)
      look.lerpVectors(f.target, rigTarget, k)
      cam.zoom = lerp(f.zoom, zoom, k)
      if (k >= 1) from.current = null
    } else cam.zoom = zoom
    cam.position.copy(pos)
    cam.lookAt(look)
    cam.updateProjectionMatrix()
  })

  if (HQ) return null
  return (
    <OrbitControls
      ref={controls}
      enabled={!playing}
      enableDamping
      dampingFactor={0.12}
      minZoom={18}
      maxZoom={320}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2.15}
      zoomToCursor
    />
  )
}

/* ---------- lighting and finish ---------- */

function Lighting() {
  return (
    <>
      <SoftShadows size={22} samples={HQ ? 14 : 6} focus={0.5} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-12, 4, 6]} rotation-y={Math.PI / 2.4} scale={[12, 5, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffeedd" position={[12, 5, 8]} rotation-y={-Math.PI / 2.4} scale={[12, 5, 1]} />
        <Lightformer form="ring" intensity={0.6} position={[0, 4, -14]} scale={8} />
      </Environment>
      <hemisphereLight args={['#F3F7F9', '#C9C3B6', 0.45]} />
      <directionalLight
        position={[8, 15, 9]}
        intensity={1.9}
        color="#FFF6EA"
        castShadow
        shadow-mapSize={HQ ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  )
}

function Finish() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={0.9} distanceFalloff={0.5} intensity={2.4} quality={HQ ? 'high' : 'performance'} halfRes={!HQ} color="#2a3b42" />
      <SMAA />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  )
}

/* ---------- base ---------- */

function Base() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.32, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial opacity={0.14} />
      </mesh>
      <RoundedBox args={[16, 0.7, 11.6]} radius={0.28} smoothness={5} position={[0, -0.35, -0.6]} receiveShadow castShadow>
        <meshStandardMaterial color={C.baseTop} roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[15.8, 0.6, 11.4]} radius={0.24} smoothness={5} position={[0, -0.95, -0.6]}>
        <meshStandardMaterial color={C.baseSide} roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[15.5, 0.12, 11.1]} radius={0.05} position={[0, -1.26, -0.6]}>
        <meshStandardMaterial color={C.baseDeep} roughness={0.95} />
      </RoundedBox>
      {/* paved service yard where the plumbing runs */}
      <RoundedBox args={[12.2, 0.04, 4.3]} radius={0.02} position={[0.3, 0.02, 1.35]} receiveShadow>
        <meshStandardMaterial color={C.paving} roughness={1} />
      </RoundedBox>
      {/* planted strips */}
      <RoundedBox args={[3.2, 0.06, 1.2]} radius={0.03} position={[-6.1, 0.03, 4.2]} receiveShadow material={mats.lawn} />
      <RoundedBox args={[2.4, 0.06, 1.2]} radius={0.03} position={[6.6, 0.03, 4.2]} receiveShadow material={mats.lawn} />
      <RoundedBox args={[1.6, 0.06, 5.5]} radius={0.03} position={[-7.1, 0.03, -2.9]} receiveShadow material={mats.lawn} />
      <Trees />
    </group>
  )
}

function Tree({ p, s = 1 }: { p: [number, number]; s?: number }) {
  return (
    <group position={[p[0], 0, p[1]]} scale={s}>
      <mesh position={[0, 0.55, 0]} castShadow material={mats.trunk}>
        <cylinderGeometry args={[0.05, 0.08, 1.1, 10]} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow material={mats.sage}>
        <sphereGeometry args={[0.62, 24, 18]} />
      </mesh>
      <mesh position={[0.32, 1.12, 0.18]} castShadow material={mats.sageDeep}>
        <sphereGeometry args={[0.38, 20, 14]} />
      </mesh>
    </group>
  )
}

function Palm({ p, h = 2.8, lean = 0.1 }: { p: [number, number]; h?: number; lean?: number }) {
  return (
    <group position={[p[0], 0, p[1]]} rotation-z={lean}>
      <mesh position={[0, h / 2, 0]} castShadow material={mats.trunk}>
        <cylinderGeometry args={[0.05, 0.09, h, 10]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[0, h, 0]} rotation-y={(i / 8) * Math.PI * 2}>
          <mesh position={[0.5, -0.12, 0]} rotation-z={-0.38} scale={[0.62, 0.035, 0.14]} castShadow material={i % 2 ? mats.sage : mats.sageDeep}>
            <sphereGeometry args={[1, 16, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Trees() {
  return (
    <group>
      <Palm p={[-7.0, -5.0]} h={3.2} lean={0.08} />
      <Tree p={[-7.0, -1.6]} s={1.05} />
      <Tree p={[-6.6, 4.3]} s={0.85} />
      <Tree p={[7.2, 0.6]} s={0.9} />
      <Tree p={[6.7, 4.2]} s={0.8} />
      <Tree p={[-3.2, -5.6]} s={0.7} />
    </group>
  )
}

/* ---------- house with rain gutter feeding tank A ---------- */

function useCorrugated(w: number, d: number) {
  return useMemo(() => {
    const g = new THREE.PlaneGeometry(w, d, 160, 1)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setY(i, Math.sin((pos.getX(i) / 0.16) * Math.PI * 2) * 0.022)
    g.computeVertexNormals()
    return g
  }, [w, d])
}

function House() {
  const roof = useCorrugated(4.2, 1.95)
  const tin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#C3CBCF', metalness: 0.55, roughness: 0.38, side: THREE.DoubleSide }), [])
  const gutterRun = useMemo(
    () =>
      run([
        [-2.6, 3.02, -1.28],
        [-2.6, 3.02, -2.4],
        [-1.6, 3.02, -2.4],
        [-1.6, 2.92, -2.4],
      ]),
    [],
  )
  const downpipe = useMemo(() => new THREE.TubeGeometry(gutterRun, 60, 0.06, 10, false), [gutterRun])
  return (
    <group>
      <group position={[-4.6, 0, -3]}>
        <RoundedBox args={[4.1, 0.25, 3.1]} radius={0.04} position={[0, 0.125, 0]} receiveShadow castShadow material={mats.concrete} />
        <RoundedBox args={[3.4, 2.8, 2.4]} radius={0.03} position={[0, 1.65, 0]} receiveShadow castShadow material={mats.clay} />
        <RoundedBox args={[0.8, 1.6, 0.06]} radius={0.02} position={[0.55, 1.05, 1.21]} material={mats.clayShade} />
        <RoundedBox args={[0.8, 0.62, 0.05]} radius={0.02} position={[-0.85, 1.75, 1.21]} material={mats.window} />
        <RoundedBox args={[0.92, 0.08, 0.14]} radius={0.02} position={[-0.85, 1.4, 1.26]} material={mats.clay} />
        {[1, -1].map((s) => (
          <mesh key={s} geometry={roof} material={tin} position={[0, 3.4, s * 0.84]} rotation-x={s * 0.4} castShadow receiveShadow />
        ))}
        <mesh position={[0, 3.77, 0]} rotation-z={Math.PI / 2} material={tin} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 4.2, 12]} />
        </mesh>
        <mesh position={[0, 3.02, 1.72]} rotation-z={Math.PI / 2} material={mats.pvc} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 4.0, 12]} />
        </mesh>
      </group>
      <mesh geometry={downpipe} material={mats.pvc} castShadow />
    </group>
  )
}

/* ---------- tanks ---------- */

function Tank({
  pos,
  radius,
  height,
  water,
  level,
}: {
  pos: readonly [number, number, number]
  radius: number
  height: number
  water: string
  level: (t: number) => number
}) {
  const waterRef = useRef<THREE.Mesh>(null)
  const surfRef = useRef<THREE.Mesh>(null)
  const base = 0.5
  const waterMat = useMemo(() => new THREE.MeshStandardMaterial({ color: water, roughness: 0.18 }), [water])
  const surfMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(water).lerp(new THREE.Color('#ffffff'), 0.4), roughness: 0.05, metalness: 0.1 }),
    [water],
  )
  useFrame(() => {
    const l = level(clock.t)
    const h = Math.max(0.02, l * (height - 0.14))
    if (waterRef.current) {
      waterRef.current.scale.y = h
      waterRef.current.position.y = base + 0.07 + h / 2
    }
    if (surfRef.current) surfRef.current.position.y = base + 0.07 + h + 0.003
  })
  return (
    <group position={[pos[0], 0, pos[2]]}>
      <RoundedBox args={[radius * 2.05, base, radius * 2.05]} radius={0.05} position={[0, base / 2, 0]} castShadow receiveShadow material={mats.concrete} />
      <mesh ref={waterRef} material={waterMat}>
        <cylinderGeometry args={[radius - 0.06, radius - 0.06, 1, 48]} />
      </mesh>
      <mesh ref={surfRef} rotation-x={-Math.PI / 2} material={surfMat}>
        <circleGeometry args={[radius - 0.06, 48]} />
      </mesh>
      <mesh position={[0, base + height / 2, 0]} material={mats.glass} castShadow>
        <cylinderGeometry args={[radius, radius, height, 48, 1, true]} />
      </mesh>
      {/* moulded ribs, like a real roto-moulded storage tank */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, base + 0.2 + i * ((height - 0.3) / 4), 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[radius + 0.006, 0.022, 8, 64]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.55} roughness={0.2} />
        </mesh>
      ))}
      {/* level gauge on the front */}
      <RoundedBox args={[0.1, height * 0.82, 0.03]} radius={0.012} position={[radius * 0.62, base + height * 0.48, radius * 0.79]} rotation-y={0.66} material={mats.clay} />
      <mesh position={[0, base + height + 0.06, 0]} castShadow material={mats.clay}>
        <cylinderGeometry args={[radius + 0.035, radius + 0.035, 0.12, 48]} />
      </mesh>
      <mesh position={[0, base + height + 0.16, 0]} castShadow material={mats.clayShade}>
        <cylinderGeometry args={[radius * 0.32, radius * 0.36, 0.1, 32]} />
      </mesh>
    </group>
  )
}

function Pond() {
  const ripples = useRef<THREE.Group>(null)
  useFrame(() => {
    ripples.current?.children.forEach((m, i) => {
      const ph = (clock.t * 0.35 + i / 3) % 1
      m.scale.setScalar(0.25 + ph * 1.0)
      ;((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.35
    })
  })
  const feed = useMemo(
    () =>
      new THREE.TubeGeometry(
        run([
          [4.15, 0.42, -2.4],
          [3.75, 0.42, -2.4],
          [3.75, 2.68, -2.4],
          [2.6, 2.68, -2.4],
          [2.6, 2.6, -2.4],
        ]),
        60,
        0.05,
        10,
        false,
      ),
    [],
  )
  return (
    <group>
      <group position={[5.6, 0, -2.6]}>
        <mesh position={[0, 0.03, 0]} receiveShadow material={mats.concrete}>
          <cylinderGeometry args={[1.62, 1.66, 0.06, 48]} />
        </mesh>
        <mesh position={[0, 0.065, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[1.48, 48]} />
          <meshStandardMaterial color={C.altWater} roughness={0.08} metalness={0.15} />
        </mesh>
        <group ref={ripples} position={[0.2, 0.07, 0.1]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.96, 1, 48]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.3} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>
      {/* small 12 V transfer pump lifting pond water into tank B */}
      <RoundedBox args={[0.5, 0.34, 0.4]} radius={0.06} position={[4.35, 0.2, -2.4]} castShadow material={mats.clayShade} />
      <mesh position={[3.75, 1.3, -2.62]} material={mats.metal} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 2.6, 8]} />
      </mesh>
      <mesh geometry={feed} material={mats.pvc} castShadow />
    </group>
  )
}

/* ---------- plumbing ---------- */

type FlowState = { on: number; front: number; color: string } | null

const supply = (which: Source) => (f: Frame): FlowState => {
  const r = f.request
  if (!r || r.source !== which) return null
  return { on: smooth(0, 0.3, r.left), front: smooth(0.05, 0.75, r.age), color: sourceColor[which] }
}
const branch = (e: Endpoint) => (f: Frame): FlowState => {
  const r = f.request
  if (!r || r.endpoint !== e) return null
  return { on: smooth(0, 0.3, r.left), front: smooth(0.55, 1.25, r.age), color: sourceColor[r.source] }
}

const SEG = 180
const RAD = 10

function Pipe({ curve, state }: { curve: THREE.CurvePath<THREE.Vector3>; state: (f: Frame) => FlowState }) {
  const outer = useMemo(() => new THREE.TubeGeometry(curve, SEG, 0.13, 16, false), [curve])
  const inner = useMemo(() => new THREE.TubeGeometry(curve, SEG, 0.095, RAD, false), [curve])
  const len = useMemo(() => curve.getLength(), [curve])
  const n = Math.round(len * 3.2)
  const col = useRef<THREE.Mesh>(null)
  const colMat = useMemo(() => new THREE.MeshStandardMaterial({ color: C.fresh, roughness: 0.2, emissiveIntensity: 0.25 }), [])
  const beads = useRef<THREE.InstancedMesh>(null)
  const beadMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tan = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  useFrame(() => {
    const t = clock.t
    const s = state(frame(t))
    // water fills the pipe from the source end and fades out by retreating when the request ends
    const front = s ? s.front * s.on : 0
    if (col.current) {
      col.current.visible = !!s && front > 0.001
      const total = inner.index!.count
      const perRing = RAD * 6
      inner.setDrawRange(0, Math.floor((front * total) / perRing) * perRing)
      if (s) {
        colMat.color.set(s.color)
        colMat.emissive.set(s.color)
      }
    }
    const b = beads.current
    if (!b) return
    for (let i = 0; i < n; i++) {
      const u = (i / n + (t * 1.5) / len) % 1
      const vis = s && u <= front ? 1 : 0
      curve.getPointAt(u, dummy.position)
      curve.getTangentAt(u, tan)
      dummy.quaternion.setFromUnitVectors(up, tan)
      dummy.scale.set(0.03 * vis, 0.16 * vis, 0.03 * vis)
      dummy.position.y += 0.035
      dummy.updateMatrix()
      b.setMatrixAt(i, dummy.matrix)
    }
    b.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <mesh geometry={outer} material={mats.tubing} castShadow />
      <mesh ref={col} geometry={inner} material={colMat} />
      <instancedMesh ref={beads} args={[undefined, undefined, n]} material={beadMat}>
        <capsuleGeometry args={[1, 1, 4, 8]} />
      </instancedMesh>
    </group>
  )
}

function Fittings() {
  return (
    <group>
      {joints.map((p, i) => (
        <mesh key={i} position={p} castShadow material={mats.pvc}>
          <sphereGeometry args={[0.16, 20, 14]} />
        </mesh>
      ))}
      <RoundedBox args={[0.42, 0.34, 0.42]} radius={0.05} position={[layout.manifold[0], layout.manifold[1], layout.manifold[2]]} castShadow material={mats.pvc} />
    </group>
  )
}

// Solenoid valve: brass body with the coil on top, flow along z.
function Valve({ pos, which }: { pos: readonly [number, number, number]; which: 'a' | 'b' }) {
  const led = useRef<THREE.MeshStandardMaterial>(null)
  const coil = useRef<THREE.Group>(null)
  const color = which === 'a' ? C.fresh : C.alt
  useFrame(() => {
    const f = frame(clock.t)
    const r = f.request
    const isOpen = !!r && (which === 'a' ? f.valveA : f.valveB)
    const open = isOpen ? smooth(0, 0.12, r!.age) * smooth(0, 0.12, r!.left) : 0
    if (led.current) {
      led.current.color.set(open > 0.5 ? color : '#56636A')
      led.current.emissive.set(color)
      led.current.emissiveIntensity = open * 2.2
    }
    // the plunger "click": a tiny kick in the coil as it energises
    if (coil.current) coil.current.position.y = 0.3 + (isOpen ? Math.max(0, 0.02 - r!.age * 0.12) : 0)
  })
  return (
    <group position={[pos[0], pos[1], pos[2]]}>
      <RoundedBox args={[0.38, 0.3, 0.44]} radius={0.05} castShadow material={mats.brass} />
      {[-0.26, 0.26].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation-x={Math.PI / 2} castShadow material={mats.brass}>
          <cylinderGeometry args={[0.14, 0.14, 0.1, 6]} />
        </mesh>
      ))}
      <group ref={coil} position={[0, 0.3, 0]}>
        <mesh castShadow material={mats.coil}>
          <cylinderGeometry args={[0.15, 0.15, 0.32, 24]} />
        </mesh>
        <mesh position={[0, 0.19, 0]} material={mats.metal}>
          <cylinderGeometry args={[0.07, 0.09, 0.06, 16]} />
        </mesh>
        <mesh position={[0.11, 0.08, 0.11]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial ref={led} color="#56636A" />
        </mesh>
      </group>
    </group>
  )
}

function FlowSensor({ pos }: { pos: readonly [number, number, number] }) {
  return (
    <group position={[pos[0], pos[1], pos[2]]}>
      <mesh rotation-x={Math.PI / 2} castShadow material={mats.coil}>
        <cylinderGeometry args={[0.15, 0.15, 0.34, 20]} />
      </mesh>
      <RoundedBox args={[0.16, 0.1, 0.2]} radius={0.02} position={[0, 0.17, 0]} material={mats.clayShade} />
    </group>
  )
}

function Controller() {
  const led = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (led.current) led.current.emissiveIntensity = 1.2 + Math.sin(clock.t * 3) * 0.4
  })
  const cables = useMemo(() => {
    const c = (pts: [number, number, number][]) =>
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 64, 0.022, 6, false)
    return [
      c([[0.1, 0.4, -0.55], [-0.4, 0.06, -0.7], [-1.2, 0.06, -0.75], [-1.55, 0.6, -0.6], [-1.6, 0.82, -0.55]]),
      c([[0.9, 0.4, -0.55], [1.4, 0.06, -0.7], [2.2, 0.06, -0.75], [2.55, 0.6, -0.6], [2.6, 0.82, -0.55]]),
      c([[0.15, 0.3, -0.4], [-0.6, 0.05, 0.0], [-1.3, 0.05, 0.2], [-1.6, 0.45, 0.25]]),
      c([[0.85, 0.3, -0.4], [1.6, 0.05, 0.0], [2.3, 0.05, 0.2], [2.6, 0.45, 0.25]]),
    ]
  }, [])
  return (
    <group>
      <group position={[layout.controller[0], 0, layout.controller[2]]}>
        <RoundedBox args={[0.9, 0.62, 0.52]} radius={0.06} position={[0, 0.4, 0]} castShadow material={mats.clay} />
        <RoundedBox args={[0.6, 0.32, 0.03]} radius={0.02} position={[0, 0.45, 0.265]} material={mats.window} />
        <mesh position={[0.32, 0.64, 0.265]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshStandardMaterial ref={led} color="#46C07E" emissive="#46C07E" emissiveIntensity={1.2} />
        </mesh>
      </group>
      {cables.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.coil} castShadow />
      ))}
    </group>
  )
}

// Ground ring that marks whatever is active right now.
function Halo({ at, r = 0.62, state }: { at: readonly [number, number]; r?: number; state: (f: Frame) => { on: number; color: string } | null }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }), [])
  useFrame(() => {
    const s = state(frame(clock.t))
    if (!ref.current) return
    ref.current.visible = !!s
    if (!s) return
    mat.color.set(s.color)
    mat.opacity = s.on * (0.55 + Math.sin(clock.t * 5) * 0.15)
    ref.current.scale.setScalar(1 + Math.sin(clock.t * 5) * 0.04)
  })
  return (
    <mesh ref={ref} material={mat} position={[at[0], 0.05, at[1]]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[r * 0.84, r, 64]} />
    </mesh>
  )
}

function Tap({ x, z, h, reach, drop, state }: { x: number; z: number; h: number; reach: number; drop: number; state: (f: Frame) => FlowState }) {
  const stream = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.1, emissiveIntensity: 0.3 }), [])
  useFrame(() => {
    const s = state(frame(clock.t))
    if (!stream.current) return
    const k = s ? smooth(0.9, 1.0, s.front) * s.on : 0
    stream.current.visible = k > 0.01
    if (s) {
      mat.color.set(s.color)
      mat.emissive.set(s.color)
    }
    mat.opacity = 0.85 * k
    stream.current.scale.y = Math.max(0.01, k)
    stream.current.position.y = h - 0.05 - (drop * k) / 2
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, (0.32 + h) / 2, 0]} castShadow material={mats.metal}>
        <cylinderGeometry args={[0.05, 0.05, h - 0.32, 12]} />
      </mesh>
      <mesh position={[0, h, reach / 2]} rotation-x={Math.PI / 2} castShadow material={mats.metal}>
        <cylinderGeometry args={[0.045, 0.045, reach, 12]} />
      </mesh>
      <mesh ref={stream} position={[0, h, reach]} material={mat}>
        <cylinderGeometry args={[0.03, 0.04, drop, 10]} />
      </mesh>
    </group>
  )
}

function Plumbing() {
  return (
    <group>
      <Pipe curve={pipes.a} state={supply('fresh')} />
      <Pipe curve={pipes.b} state={supply('alt')} />
      {(['kitchen', 'toilet', 'floor', 'washing'] as Endpoint[]).map((e) => (
        <Pipe key={e} curve={pipes[e]} state={branch(e)} />
      ))}
      <Fittings />
      <Valve pos={layout.valveA} which="a" />
      <Valve pos={layout.valveB} which="b" />
      <FlowSensor pos={layout.sensorA} />
      <FlowSensor pos={layout.sensorB} />
      <Controller />
      <Halo at={[layout.valveA[0], layout.valveA[2]]} state={supply('fresh')} />
      <Halo at={[layout.valveB[0], layout.valveB[2]]} state={supply('alt')} />
    </group>
  )
}

/* ---------- household uses ---------- */

function Kitchen() {
  return (
    <group position={[layout.kitchen[0], 0, layout.kitchen[2]]}>
      <RoundedBox args={[1.7, 0.86, 0.85]} radius={0.04} position={[0, 0.43, 0.15]} castShadow receiveShadow material={mats.clay} />
      <mesh position={[-0.4, 0.88, 0.15]} material={mats.coil}>
        <cylinderGeometry args={[0.26, 0.26, 0.04, 28]} />
      </mesh>
      <mesh position={[-0.4, 1.04, 0.15]} castShadow material={mats.metal}>
        <cylinderGeometry args={[0.24, 0.2, 0.28, 28]} />
      </mesh>
      <mesh position={[0.45, 1.08, 0.18]} castShadow>
        <sphereGeometry args={[0.23, 24, 18]} />
        <meshStandardMaterial color={C.terracotta} roughness={0.85} />
      </mesh>
      <mesh position={[0.45, 1.33, 0.18]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.12, 18]} />
        <meshStandardMaterial color={C.terracotta} roughness={0.85} />
      </mesh>
    </group>
  )
}

function Latrine() {
  return (
    <group position={[layout.toilet[0], 0, layout.toilet[2]]}>
      <RoundedBox args={[1.05, 1.6, 1.05]} radius={0.04} position={[0, 0.8, 0]} castShadow receiveShadow material={mats.clay} />
      <RoundedBox args={[1.25, 0.06, 1.3]} radius={0.02} position={[0, 1.64, 0.04]} rotation-x={0.08} castShadow material={mats.clayShade} />
      <RoundedBox args={[0.55, 1.15, 0.04]} radius={0.02} position={[0, 0.62, 0.53]} material={mats.clayShade} />
      <RoundedBox args={[0.5, 0.3, 0.18]} radius={0.03} position={[0, 1.1, -0.6]} castShadow material={mats.clayShade} />
      <mesh position={[0, 0.66, -0.55]} material={mats.metal}>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 10]} />
      </mesh>
    </group>
  )
}

function Bucket() {
  return (
    <group position={[layout.floor[0], 0, layout.floor[2]]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.27, 0.6, 28, 1, true]} />
        <meshStandardMaterial color="#9FB5BE" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.04, 28]} />
        <meshStandardMaterial color="#9FB5BE" />
      </mesh>
      <mesh position={[0.48, 0.75, 0.05]} rotation-z={-0.28} castShadow material={mats.trunk}>
        <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
      </mesh>
    </group>
  )
}

function WashSlab() {
  return (
    <group position={[layout.washing[0], 0, layout.washing[2]]}>
      <RoundedBox args={[1.6, 0.16, 1.2]} radius={0.04} position={[0, 0.08, 0.1]} castShadow receiveShadow material={mats.concrete} />
      <mesh position={[0, 0.3, 0.05]} castShadow material={mats.metal}>
        <cylinderGeometry args={[0.46, 0.32, 0.28, 32, 1, true]} />
      </mesh>
      <mesh position={[0, 0.18, 0.05]} material={mats.metal}>
        <cylinderGeometry args={[0.32, 0.32, 0.03, 32]} />
      </mesh>
    </group>
  )
}

function Uses() {
  return (
    <group>
      <Kitchen />
      <Latrine />
      <Bucket />
      <WashSlab />
      <Tap x={-4.6} z={2.45} h={1.25} reach={0.3} drop={0.32} state={branch('kitchen')} />
      <Tap x={2.1} z={2.95} h={1.0} reach={0.36} drop={0.45} state={branch('floor')} />
      <Tap x={5.0} z={2.45} h={0.95} reach={0.45} drop={0.6} state={branch('washing')} />
      {(Object.keys(endpoints) as Endpoint[]).map((e) => (
        <Halo
          key={e}
          at={[layout[e][0], layout[e][2] + (e === 'kitchen' ? 0.15 : 0)]}
          r={e === 'toilet' ? 0.95 : 1.05}
          state={(f) => (f.request?.endpoint === e ? { on: smooth(0.6, 1.0, f.request.age) * smooth(0, 0.3, f.request.left), color: sourceColor[f.request.source] } : null)}
        />
      ))}
    </group>
  )
}

/* ---------- forecast ribbon with the rain cloud ---------- */

function Rail() {
  const covered = useRef<THREE.Mesh>(null)
  const gap = useRef<THREE.Mesh>(null)
  const red = useRef<THREE.Group>(null)
  const blue = useRef<THREE.Group>(null)
  const cloud = useRef<THREE.Group>(null)
  const drops = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const x0 = railX(0)
  const cloudMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#FBFCFC', roughness: 0.75 }), [])

  useFrame(() => {
    const f = frame(clock.t)
    const runway = lerp(f.conv.runway, f.plan.runway, f.bufferBlend)
    const rain = f.rainDay
    if (covered.current) {
      const w = railX(Math.min(runway, rain)) - x0
      covered.current.scale.x = Math.max(0.001, w)
      covered.current.position.x = x0 + w / 2
    }
    if (gap.current) {
      const w = Math.max(0, railX(rain) - railX(runway))
      gap.current.scale.x = Math.max(0.001, w)
      gap.current.position.x = railX(runway) + w / 2
      gap.current.visible = w > 0.02
    }
    if (red.current) red.current.position.x = railX(f.conv.runway)
    if (blue.current) {
      blue.current.position.x = railX(runway)
      blue.current.scale.setScalar(Math.max(0.001, f.bufferBlend))
    }
    if (cloud.current) {
      cloud.current.position.x = railX(rain)
      cloud.current.position.y = Math.sin(clock.t * 0.8) * 0.05
    }
    if (drops.current) {
      for (let i = 0; i < 16; i++) {
        const ph = (clock.t * 0.85 + i * 0.37) % 1
        dummy.position.set(((i * 53) % 9) / 9 - 0.45, 1.75 - ph * 1.3, ((i * 31) % 7) / 7 - 0.4)
        dummy.scale.set(0.018, 0.14, 0.018)
        dummy.updateMatrix()
        drops.current.setMatrixAt(i, dummy.matrix)
      }
      drops.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group position={[0, RAIL_Y, RAIL_Z]}>
      <RoundedBox args={[railX(10) - x0 + 0.8, 0.14, 0.46]} radius={0.06} position={[0, 0.07, 0]} castShadow material={mats.clay} />
      {[railX(0) - 0.25, railX(10) + 0.25].map((mx) => (
        <mesh key={mx} position={[mx, -RAIL_Y / 2, 0]} castShadow material={mats.metal}>
          <cylinderGeometry args={[0.04, 0.04, RAIL_Y, 10]} />
        </mesh>
      ))}
      <mesh ref={covered} position={[0, 0.17, 0]}>
        <boxGeometry args={[1, 0.06, 0.26]} />
        <meshStandardMaterial color={C.fresh} roughness={0.4} />
      </mesh>
      <mesh ref={gap} position={[0, 0.17, 0]}>
        <boxGeometry args={[1, 0.06, 0.26]} />
        <meshStandardMaterial color={C.risk} roughness={0.4} />
      </mesh>
      {Array.from({ length: 11 }, (_, d) => (
        <mesh key={d} position={[railX(d), 0.2, 0.25]} material={mats.coil}>
          <boxGeometry args={[0.03, 0.08, 0.06]} />
        </mesh>
      ))}
      <group ref={red}>
        <mesh position={[0, 0.55, 0]} material={mats.coil}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
        </mesh>
        <RoundedBox args={[0.34, 0.2, 0.03]} radius={0.01} position={[0.17, 0.84, 0]}>
          <meshStandardMaterial color={C.risk} />
        </RoundedBox>
      </group>
      <group ref={blue} position={[0, 0, 0.2]}>
        <mesh position={[0, -0.25, 0]} material={mats.coil}>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        </mesh>
        <RoundedBox args={[0.34, 0.2, 0.03]} radius={0.01} position={[0.17, -0.4, 0]}>
          <meshStandardMaterial color={C.fresh} />
        </RoundedBox>
      </group>
      <group ref={cloud} position={[0, 0, -0.2]}>
        {[
          [0, 2.1, 0, 0.5],
          [0.48, 2.0, 0.08, 0.38],
          [-0.46, 1.98, 0, 0.36],
          [0.16, 2.42, -0.06, 0.4],
        ].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} castShadow material={cloudMat}>
            <sphereGeometry args={[r, 32, 24]} />
          </mesh>
        ))}
        <instancedMesh ref={drops} args={[undefined, undefined, 16]}>
          <capsuleGeometry args={[1, 1, 4, 8]} />
          <meshStandardMaterial color="#6E9CC6" />
        </instancedMesh>
      </group>
      <RailLabels />
    </group>
  )
}

function RailLabels() {
  const t = useClock()
  const f = frame(t)
  const runway = lerp(f.conv.runway, f.plan.runway, f.bufferBlend)
  return (
    <>
      {Array.from({ length: 11 }, (_, d) => (
        <Html key={d} position={[railX(d), -0.08, 0.5]} center zIndexRange={[6, 0]}>
          <span className="rail-day">{d}</span>
        </Html>
      ))}
      <Html position={[railX(f.rainDay) + 1.35, 2.1, -0.2]} center zIndexRange={[6, 0]}>
        <div className="tag tag-rain">
          <b>Reliable rain</b>
          <span>day {f.rainDay.toFixed(0)}</span>
        </div>
      </Html>
      <Html position={[railX(f.conv.runway) + 0.2, 1.4, 0]} center zIndexRange={[6, 0]}>
        <div className="tag tag-risk" style={{ opacity: f.bufferOn ? 0.55 : 1 }}>
          <b>Runs dry</b>
          <span>day {f.conv.runway.toFixed(1)}</span>
        </div>
      </Html>
      <Html position={[railX(runway), -0.85, 0.3]} center zIndexRange={[6, 0]}>
        <div className="tag tag-fresh" style={{ opacity: f.bufferBlend, visibility: f.bufferOn ? 'visible' : 'hidden' }}>
          <b>BUFFER holds</b>
          <span>day {runway.toFixed(1)}</span>
        </div>
      </Html>
    </>
  )
}

/* ---------- floating labels ---------- */

function Tag({ at, children }: { at: [number, number, number]; children: ReactNode }) {
  return (
    <Html position={at} center zIndexRange={[6, 0]}>
      {children}
    </Html>
  )
}

function SceneLabels() {
  const t = useClock()
  const f = frame(t)
  const r = f.request
  const valve = (open: boolean, name: string, src: Source) => (
    <div className={`tag tag-valve ${open ? `is-open is-${src}` : ''}`}>
      <b>{name}</b>
      <span>{open ? 'Open' : 'Closed'}</span>
    </div>
  )
  return (
    <>
      <Tag at={[layout.tankA[0], 3.75, layout.tankA[2]]}>
        <div className="tag tag-tank is-fresh">
          <b>Freshwater reserve</b>
          <span>Stored rainwater, 200 L</span>
        </div>
      </Tag>
      <Tag at={[layout.tankB[0], 3.35, layout.tankB[2]]}>
        <div className="tag tag-tank is-alt">
          <b>Alternative source</b>
          <span>Pond water, non-potable</span>
        </div>
      </Tag>
      <Tag at={[layout.valveA[0] - 0.95, 1.05, layout.valveA[2]]}>{valve(f.valveA, 'Valve A', 'fresh')}</Tag>
      <Tag at={[layout.valveB[0] + 0.95, 1.05, layout.valveB[2]]}>{valve(f.valveB, 'Valve B', 'alt')}</Tag>
      {(Object.keys(endpoints) as Endpoint[]).map((e) => {
        const active = r?.endpoint === e
        const p = layout[e]
        return (
          <Tag key={e} at={[p[0], e === 'toilet' ? 2.25 : 1.7, p[2] + 0.2]}>
            <div className={`tag tag-use ${active ? `is-active is-${r!.source}` : ''}`}>
              <b>{endpoints[e].name}</b>
              <span>{active ? (r!.source === 'fresh' ? 'From freshwater' : 'From alternative') : endpoints[e].critical ? 'Critical use' : 'Flexible use'}</span>
            </div>
          </Tag>
        )
      })}
    </>
  )
}

/* ---------- assembled scene ---------- */

export function Scene() {
  return (
    <>
      <CameraRig />
      <color attach="background" args={['#DDE7EA']} />
      <Lighting />
      <Base />
      <House />
      <Tank pos={layout.tankA} radius={0.95} height={2.3} water={C.fresh} level={(t) => 0.9 - flowSeconds(t, 'fresh') * 0.009} />
      <Tank pos={layout.tankB} radius={0.85} height={2.0} water={C.altWater} level={(t) => 0.8 - flowSeconds(t, 'alt') * 0.009} />
      <Pond />
      <Plumbing />
      <Uses />
      <Rail />
      <SceneLabels />
      <Finish />
    </>
  )
}

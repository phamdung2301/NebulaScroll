import { Suspense, lazy, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { createFlight } from './game/flight'

// Lazy-load the 3D scene so the intro overlay paints before three.js finishes loading.
const GameScene = lazy(() =>
  import('./components/GameScene').then((m) => ({ default: m.GameScene })),
)
import { Hud } from './components/Hud'
import { IntroOverlay, StoryPanel, CompletionScreen, ReadingMode } from './components/Panels'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useGame } from './game/store'
import { MISSIONS, buildAsteroids } from './game/data'

export default function App() {
  const flight = useMemo(() => createFlight(), [])
  const rocks = useMemo(() => buildAsteroids(), [])
  const phase = useGame((s) => s.phase)
  const panel = useGame((s) => s.panel)
  const drag = useRef({ active: false, lastX: 0 })

  // Remove the static boot loader once React has mounted.
  useEffect(() => {
    document.getElementById('boot-loader')?.remove()
  }, [])

  // Demo params for verification screenshots only (?demo=panel|done|joystick).
  const demo = useMemo(() => new URLSearchParams(window.location.search).get('demo'), [])
  useEffect(() => {
    if (demo === 'panel') {
      useGame.setState({ phase: 'playing', panel: { missionId: 'nv1' }, startTime: Date.now() })
    } else if (demo === 'done') {
      useGame.setState({
        phase: 'done',
        elapsedMs: 187000,
        hits: 2,
        completed: ['nv1', 'nv2', 'nv3', 'nv4'],
        shards: ['shard-1', 'shard-2', 'shard-3'],
      })
    }
  }, [demo])

  const performScan = () => {
    const s = useGame.getState()
    const target = s.nearTarget
    if (!target || s.panel || s.phase !== 'playing') return
    if (target.id === 'moon') {
      s.setMoonScanned()
      s.showToast('Đã quét Mặt trăng. Giờ hãy bay tới Hành tinh và quét nó.')
      return
    }
    const mission = MISSIONS[s.missionIndex]
    if (mission) {
      s.openPanel(mission.id)
      s.completeMission(mission.id)
    }
  }

  // Keyboard controls.
  useEffect(() => {
    const down = (e) => {
      const st = useGame.getState()
      if (e.code === 'KeyF') {
        st.toggleFps()
        return
      }
      if (st.panel) {
        if (e.code === 'Enter' || e.code === 'Escape') st.closePanel()
        return
      }
      if (st.phase !== 'playing') return
      if (e.code === 'KeyE') {
        performScan()
        return
      }
      if (e.code.startsWith('Arrow')) e.preventDefault()
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') flight.boost = true
      flight.keys[e.code] = true
    }
    const up = (e) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') flight.boost = false
      flight.keys[e.code] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight])

  return (
    <ErrorBoundary>
      <div
        className="game-root"
        onPointerDown={(e) => {
          // Only the canvas starts a camera drag. Capturing the pointer on a
          // button click would retarget the click to this root and break it.
          if (e.target.tagName !== 'CANVAS') return
          drag.current = { active: true, lastX: e.clientX }
          e.currentTarget.setPointerCapture?.(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current.active) return
          const dx = e.clientX - drag.current.lastX
          drag.current.lastX = e.clientX
          flight.orbitYaw = (flight.orbitYaw || 0) + dx * 0.005
        }}
        onPointerUp={() => {
          drag.current.active = false
        }}
        onPointerCancel={() => {
          drag.current.active = false
        }}
      >
        <div className="game-canvas">
          <Canvas
            dpr={[1, 1.75]}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            camera={{ fov: 55, near: 0.1, far: 900, position: [0, 6.5, 59] }}
            onCreated={({ camera }) => {
              camera.position.set(0, 6.5, 59)
            }}
          >
            <Suspense fallback={null}>
              <GameScene flight={flight} rocks={rocks} />
            </Suspense>
          </Canvas>
        </div>

        {phase === 'playing' && (
          <Hud flight={flight} rocks={rocks} onScan={performScan} forceJoystick={demo === 'joystick'} />
        )}
        {phase === 'intro' && <IntroOverlay />}
        {panel && phase === 'playing' && <StoryPanel />}
        {phase === 'reading' && <ReadingMode />}
        {phase === 'done' && <CompletionScreen />}
      </div>
    </ErrorBoundary>
  )
}

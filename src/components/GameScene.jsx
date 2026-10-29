import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useGame } from '../game/store'
import {
  POIS,
  PLANET_POS,
  MOON_ORBIT_RADIUS,
  SHARDS,
  SECTOR_RADIUS,
  mulberry32,
} from '../game/data'

function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, inner)
  g.addColorStop(0.35, inner.replace('1)', '0.6)'))
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  return tex
}

function cloudTexture(colorStops) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')
  const rng = mulberry32(777)
  for (let i = 0; i < 26; i++) {
    const x = 40 + rng() * 176
    const y = 40 + rng() * 176
    const r = 22 + rng() * 55
    const col = colorStops[Math.floor(rng() * colorStops.length)]
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, col)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  return new THREE.CanvasTexture(c)
}

function planetTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const ctx = c.getContext('2d')
  const rng = mulberry32(4242)
  const ocean = ctx.createLinearGradient(0, 0, 0, 512)
  ocean.addColorStop(0, '#274d7a')
  ocean.addColorStop(0.5, '#1d3a5e')
  ocean.addColorStop(1, '#274d7a')
  ctx.fillStyle = ocean
  ctx.fillRect(0, 0, 1024, 512)
  // Continents: deliberate blobs, not random dots.
  for (let i = 0; i < 14; i++) {
    const cx = rng() * 1024
    const cy = 70 + rng() * 372
    const base = 30 + rng() * 70
    ctx.fillStyle = rng() > 0.5 ? '#4a7a4f' : '#8a7a52'
    for (let j = 0; j < 12; j++) {
      const x = cx + (rng() - 0.5) * base * 2
      const y = cy + (rng() - 0.5) * base
      const r = 12 + rng() * 30
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Ice caps
  ctx.fillStyle = 'rgba(240,244,255,0.9)'
  ctx.fillRect(0, 0, 1024, 26)
  ctx.fillRect(0, 486, 1024, 26)
  // Clouds
  for (let i = 0; i < 46; i++) {
    const x = rng() * 1024
    const y = rng() * 512
    const r = 16 + rng() * 42
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeStars(count, rMin, rMax, size, seed) {
  const rng = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const warm = new THREE.Color('#ffd9a0')
  const cool = new THREE.Color('#cdd6ff')
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1)
    if (v.lengthSq() === 0) v.set(0, 1, 0)
    v.normalize().multiplyScalar(rMin + rng() * (rMax - rMin))
    positions.set([v.x, v.y, v.z], i * 3)
    const c = rng() < 0.12 ? warm : cool
    colors.set([c.r, c.g, c.b], i * 3)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return { geo, size }
}

function StarLayer({ config, texture }) {
  const { geo, size } = useMemo(
    () => makeStars(config.count, config.rMin, config.rMax, config.size, config.seed),
    [config],
  )
  return (
    <points geometry={geo}>
      <pointsMaterial
        size={size}
        map={texture}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

function NebulaClouds() {
  const group = useRef(null)
  const tex = useMemo(
    () =>
      cloudTexture([
        'rgba(139,110,255,0.55)',
        'rgba(70,90,220,0.5)',
        'rgba(255,150,90,0.35)',
        'rgba(200,120,255,0.45)',
      ]),
    [],
  )
  const clouds = [
    { pos: [-60, 12, -80], scale: 95, opacity: 0.5 },
    { pos: [70, -6, -60], scale: 80, opacity: 0.45 },
    { pos: [0, 18, -115], scale: 125, opacity: 0.5 },
    { pos: [-95, 2, 20], scale: 72, opacity: 0.4 },
    { pos: [95, 22, 40], scale: 78, opacity: 0.42 },
    { pos: [0, -12, 95], scale: 62, opacity: 0.38 },
  ]
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.elapsedTime * 0.004
  })
  return (
    <group ref={group}>
      {clouds.map((cl, i) => (
        <sprite key={i} position={cl.pos} scale={[cl.scale, cl.scale, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            opacity={cl.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  )
}

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const atmosphereFragment = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    gl_FragColor = vec4(0.65, 0.55, 1.0, 1.0) * intensity;
  }
`

function PlanetSystem({ flight }) {
  const tex = useMemo(() => planetTexture(), [])
  const moon = useRef(null)
  const orbit = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2
      pts.push(
        new THREE.Vector3(
          PLANET_POS[0] + Math.cos(a) * MOON_ORBIT_RADIUS,
          0,
          PLANET_POS[2] + Math.sin(a) * MOON_ORBIT_RADIUS,
        ),
      )
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    return geo
  }, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.08
    const mx = PLANET_POS[0] + Math.cos(t) * MOON_ORBIT_RADIUS
    const mz = PLANET_POS[2] + Math.sin(t) * MOON_ORBIT_RADIUS
    flight.moonPos.set(mx, 0, mz)
    if (moon.current) moon.current.position.set(mx, 0, mz)
  })
  return (
    <group>
      <mesh position={PLANET_POS}>
        <sphereGeometry args={[6, 48, 48]} />
        <meshStandardMaterial map={tex} roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={PLANET_POS} scale={1.08}>
        <sphereGeometry args={[6, 48, 48]} />
        <shaderMaterial
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <lineLoop geometry={orbit}>
        <lineBasicMaterial color="#b39bff" transparent opacity={0.25} />
      </lineLoop>
      <mesh ref={moon}>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshStandardMaterial color="#b9bcc9" roughness={1} />
      </mesh>
    </group>
  )
}

function AsteroidBelt({ rocks }) {
  const refs = useRef([])
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      m.rotation.x += rocks[i].spin * delta
      m.rotation.y += rocks[i].spin * 0.7 * delta
      m.position.y = rocks[i].pos[1] + Math.sin(t * 0.3 + i) * 0.4
    })
  })
  return (
    <group>
      {rocks.map((r, i) => (
        <mesh
          key={r.id}
          ref={(el) => {
            refs.current[i] = el
          }}
          position={r.pos}
          rotation={r.rot}
          scale={r.radius}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#8a8a92" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Ship({ flight }) {
  const group = useRef(null)
  const trailRef = useRef(null)
  const trail = useMemo(() => {
    const N = 42
    const positions = new Float32Array(N * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setDrawRange(0, 0)
    return { geo, N, history: [] }
  }, [])
  const glowTex = useMemo(() => radialTexture(), [])
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.position.copy(flight.pos)
    group.current.position.y = Math.sin(t * 2) * 0.15
    group.current.rotation.y = flight.heading
    // Trail: keep recent positions, rebuild the line.
    const h = trail.history
    const last = h[h.length - 1]
    if (!last || last.distanceToSquared(flight.pos) > 0.09) {
      h.push(flight.pos.clone())
      if (h.length > trail.N) h.shift()
    }
    const attr = trail.geo.getAttribute('position')
    for (let i = 0; i < h.length; i++) {
      attr.setXYZ(i, h[i].x, h[i].y, h[i].z)
    }
    attr.needsUpdate = true
    trail.geo.setDrawRange(0, h.length)
    if (trailRef.current) trailRef.current.visible = h.length > 1
  })
  return (
    <group>
      <group ref={group}>
        {/* fuselage, nose points +Z */}
        <mesh>
          <boxGeometry args={[0.7, 0.5, 2.6]} />
          <meshStandardMaterial color="#9fb4d8" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.35, 1, 16]} />
          <meshStandardMaterial color="#c8d6f2" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.32, 0.4]} scale={[1, 0.6, 1.4]}>
          <sphereGeometry args={[0.32, 16, 16]} />
          <meshStandardMaterial color="#7ee7ff" emissive="#7ee7ff" emissiveIntensity={1.4} />
        </mesh>
        <mesh position={[-1.05, 0, -0.3]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[1.6, 0.12, 0.9]} />
          <meshStandardMaterial color="#6d84b8" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[1.05, 0, -0.3]} rotation={[0, 0, -0.15]}>
          <boxGeometry args={[1.6, 0.12, 0.9]} />
          <meshStandardMaterial color="#6d84b8" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[-0.45, 0, -1.45]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.5, 12]} />
          <meshStandardMaterial color="#ff9d5c" emissive="#ff7a2a" emissiveIntensity={2} />
        </mesh>
        <mesh position={[0.45, 0, -1.45]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.5, 12]} />
          <meshStandardMaterial color="#ff9d5c" emissive="#ff7a2a" emissiveIntensity={2} />
        </mesh>
      </group>
      <line ref={trailRef} geometry={trail.geo}>
        <lineBasicMaterial color="#b39bff" transparent opacity={0.7} />
      </line>
      {/* engine glow sprites are attached to the ship group visually via trail start */}
      <sprite position={[0, 0, 0]} scale={[1, 1, 1]} visible={false}>
        <spriteMaterial map={glowTex} transparent opacity={0} depthWrite={false} />
      </sprite>
    </group>
  )
}

function PoiMarkers({ glowTex, rocks }) {
  const beacons = [POIS.star, POIS.station, POIS.planet, POIS.gate]
  const group = useRef(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.08
    group.current.children.forEach((child) => {
      if (child.userData.pulse) child.scale.setScalar(child.userData.base * s)
    })
  })
  return (
    <group ref={group}>
      {beacons.map((b) => (
        <group key={b.id} position={b.pos}>
          <sprite scale={[9, 9, 1]} userData={{ pulse: true, base: 9 }}>
            <spriteMaterial
              map={glowTex}
              color={b.color}
              transparent
              opacity={0.55}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          <mesh position={[0, 15, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 30, 8, 1, true]} />
            <meshBasicMaterial color={b.color} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
            <ringGeometry args={[2.6, 3, 40]} />
            <meshBasicMaterial color={b.color} transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {SHARDS.map((s) => (
        <group key={s.id} position={s.pos}>
          <mesh>
            <octahedronGeometry args={[0.9, 0]} />
            <meshStandardMaterial color="#ffc978" emissive="#ff9d2a" emissiveIntensity={1.6} />
          </mesh>
          <sprite scale={[4.5, 4.5, 1]}>
            <spriteMaterial
              map={glowTex}
              color="#ffc978"
              transparent
              opacity={0.5}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </group>
      ))}
      {/* Dawn gate ring */}
      <group position={POIS.gate.pos}>
        <mesh>
          <torusGeometry args={[4, 0.28, 12, 48]} />
          <meshStandardMaterial color="#ff9d5c" emissive="#ff7a2a" emissiveIntensity={1.5} />
        </mesh>
      </group>
      {/* Derelict station */}
      <group position={POIS.station.pos}>
        <mesh>
          <boxGeometry args={[2.2, 1.2, 3.4]} />
          <meshStandardMaterial color="#7d8296" metalness={0.6} roughness={0.6} />
        </mesh>
        <mesh position={[-2.2, 0, 0]}>
          <boxGeometry args={[2.4, 0.15, 1.4]} />
          <meshStandardMaterial color="#2a4a7a" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[2.2, 0, 0]}>
          <boxGeometry args={[2.4, 0.15, 1.4]} />
          <meshStandardMaterial color="#2a4a7a" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
      {/* Young star core */}
      <group position={POIS.star.pos}>
        <mesh>
          <sphereGeometry args={[1.3, 24, 24]} />
          <meshStandardMaterial color="#ffe2b0" emissive="#ffc978" emissiveIntensity={2.4} />
        </mesh>
        <pointLight color="#ffc978" intensity={60} distance={40} decay={1.6} />
      </group>
    </group>
  )
}

function BoundaryRing() {
  const geo = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * SECTOR_RADIUS, -1.5, Math.sin(a) * SECTOR_RADIUS))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  return (
    <lineLoop geometry={geo}>
      <lineBasicMaterial color="#b39bff" transparent opacity={0.18} />
    </lineLoop>
  )
}

// Adaptive performance: if the frame rate stays low, step the pixel ratio down.
function AdaptivePerf() {
  const { gl } = useThree()
  const acc = useRef({ time: 0, frames: 0, step: 0 })
  useFrame((_, delta) => {
    const a = acc.current
    a.time += delta
    a.frames += 1
    if (a.time >= 2) {
      const fps = a.frames / a.time
      a.time = 0
      a.frames = 0
      if (fps < 45 && a.step < 2) {
        a.step += 1
        gl.setPixelRatio(a.step === 1 ? 1.25 : 1)
      }
    }
  })
  return null
}

function CameraRig({ flight }) {
  const tmp = useMemo(() => ({ desired: new THREE.Vector3(), look: new THREE.Vector3() }), [])
  useFrame(({ camera }, delta) => {
    const f = flight
    const fx = Math.sin(f.heading)
    const fz = Math.cos(f.heading)
    const ox = Math.sin(f.heading + (f.orbitYaw || 0))
    const oz = Math.cos(f.heading + (f.orbitYaw || 0))
    tmp.desired.set(f.pos.x - ox * 13, 6.5, f.pos.z - oz * 13)
    camera.position.x = THREE.MathUtils.damp(camera.position.x, tmp.desired.x, 8, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, tmp.desired.y, 8, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, tmp.desired.z, 8, delta)
    tmp.look.set(f.pos.x + fx * 8, 1, f.pos.z + fz * 8)
    camera.lookAt(tmp.look)
  })
  return null
}

function FpsMeter() {
  const showFps = useGame((s) => s.showFps)
  const acc = useRef({ time: 0, frames: 0 })
  useFrame((_, delta) => {
    if (!showFps) return
    const a = acc.current
    a.time += delta
    a.frames += 1
    if (a.time >= 0.5) {
      const el = document.getElementById('fps-value')
      if (el) el.textContent = `${Math.round(a.frames / a.time)} FPS`
      a.time = 0
      a.frames = 0
    }
  })
  return null
}

function GameLogic({ flight, rocks }) {
  const away = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = useGame.getState()
    if (s.phase !== 'playing' || s.panel) return
    const f = flight
    const now = performance.now() / 1000

    // Steering
    let yaw = 0
    if (f.keys.KeyA || f.keys.ArrowLeft) yaw += 1
    if (f.keys.KeyD || f.keys.ArrowRight) yaw -= 1
    if (f.joy.active) yaw += -f.joy.x
    f.heading += yaw * 1.7 * dt

    // Thrust
    let thrust = 0
    if (f.keys.KeyW || f.keys.ArrowUp) thrust += 1
    if (f.keys.KeyS || f.keys.ArrowDown) thrust -= 0.7
    if (f.joy.active) thrust += -f.joy.y
    const maxSpeed = f.boost ? 22 : 13
    if (thrust > 0) f.speed = Math.min(maxSpeed, f.speed + 26 * dt * thrust)
    else if (thrust < 0) f.speed = Math.max(0, f.speed + 20 * dt * thrust)
    else f.speed = Math.max(0, f.speed - 6 * dt)

    const fx = Math.sin(f.heading)
    const fz = Math.cos(f.heading)
    f.pos.x += fx * f.speed * dt
    f.pos.z += fz * f.speed * dt

    // Soft sector boundary
    const r = Math.hypot(f.pos.x, f.pos.z)
    if (r > SECTOR_RADIUS) {
      f.pos.x *= SECTOR_RADIUS / r
      f.pos.z *= SECTOR_RADIUS / r
      f.speed *= 0.5
    }

    // Asteroid collisions
    if (now > f.invulnUntil) {
      for (const rock of rocks) {
        const dx = f.pos.x - rock.pos[0]
        const dy = 0 - rock.pos[1]
        const dz = f.pos.z - rock.pos[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < rock.radius + 1.3) {
          useGame.getState().damage(20)
          f.invulnUntil = now + 1
          f.lastHitAt = now
          away.set(dx, 0, dz).normalize()
          f.pos.x += away.x * 3.5
          f.pos.z += away.z * 3.5
          f.speed *= 0.4
          break
        }
      }
    }

    // Shield regen after 4s without a hit, in 1-point ticks (no per-frame setState)
    if (now - f.lastHitAt > 4) {
      f.regenAcc += dt
      if (f.regenAcc >= 0.25) {
        f.regenAcc = 0
        const st2 = useGame.getState()
        if (st2.shield < 100) st2.restoreShield(1)
      }
    } else {
      f.regenAcc = 0
    }

    // Mission triggers
    const st = useGame.getState()
    const idx = st.missionIndex
    const near = (pos, radius) => {
      const dx = f.pos.x - pos[0]
      const dz = f.pos.z - pos[2]
      return Math.hypot(dx, dz) < radius
    }

    if (idx === 1) {
      // Shard auto-collect
      for (const shard of SHARDS) {
        if (!st.shards.includes(shard.id) && near(shard.pos, 4.5)) {
          st.collectShard(shard.id)
        }
      }
      const after = useGame.getState()
      if (after.shards.length >= 3 && !after.completed.includes('nv2')) {
        after.completeMission('nv2')
        after.openPanel('nv2')
      }
      st.setNearTarget(null)
      return
    }

    if (idx === 4) {
      if (near(POIS.gate.pos, POIS.gate.scanRadius)) {
        st.setNearTarget({ kind: 'gate', id: 'gate', label: POIS.gate.label })
        st.finishGame()
      } else {
        st.setNearTarget(null)
      }
      return
    }

    let target = null
    if (idx === 0) target = { kind: 'scan', id: 'star', label: POIS.star.label, pos: POIS.star.pos, radius: POIS.star.scanRadius }
    else if (idx === 2) target = { kind: 'scan', id: 'station', label: POIS.station.label, pos: POIS.station.pos, radius: POIS.station.scanRadius }
    else if (idx === 3) {
      if (!st.moonScanned) {
        const mp = f.moonPos
        target = { kind: 'scan', id: 'moon', label: POIS.moon.label, pos: [mp.x, 0, mp.z], radius: POIS.moon.scanRadius }
      } else {
        target = { kind: 'scan', id: 'planet', label: POIS.planet.label, pos: POIS.planet.pos, radius: POIS.planet.scanRadius }
      }
    }
    if (target && near(target.pos, target.radius)) st.setNearTarget(target)
    else st.setNearTarget(null)
  })
  return null
}

export function GameScene({ flight, rocks }) {
  const glowTex = useMemo(() => radialTexture(), [])
  const starLayers = [
    { count: 1400, rMin: 90, rMax: 150, size: 1.5, seed: 11 },
    { count: 1100, rMin: 140, rMax: 220, size: 1.15, seed: 23 },
    { count: 800, rMin: 200, rMax: 320, size: 0.9, seed: 37 },
  ]
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[30, 40, 20]} intensity={1.2} />
      {starLayers.map((cfg, i) => (
        <StarLayer key={i} config={cfg} texture={glowTex} />
      ))}
      <NebulaClouds />
      <PlanetSystem flight={flight} />
      <AsteroidBelt rocks={rocks} />
      <Ship flight={flight} />
      <PoiMarkers glowTex={glowTex} rocks={rocks} />
      <BoundaryRing />
      <CameraRig flight={flight} />
      <GameLogic flight={flight} rocks={rocks} />
      <AdaptivePerf />
      <FpsMeter />
    </>
  )
}

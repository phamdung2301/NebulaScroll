import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  CAM_LOOK,
  CAM_POS,
  CHAPTERS,
  PLANET_POS,
  UNIFORM_KEYS,
  cameraTForProgress,
  convergeForProgress,
  flashForProgress,
  sampleKeys,
} from '../data/story.js'

/** Deterministic PRNG so star/particle layouts are stable across renders. */
function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BOUNDS = [0, 100 / 700, 250 / 700, 400 / 700, 550 / 700, 1]

/** Soft radial glow texture shared by the flash + hero sprites. */
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 128
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(230,220,255,0.55)')
    g.addColorStop(1, 'rgba(180,160,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

/** Baked planet surface texture (one canvas paint at load, not per-pixel fbm). */
function usePlanetTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 256
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#6b5f7d'
    ctx.fillRect(0, 0, 512, 256)
    const rand = mulberry32(99)
    for (let i = 0; i < 500; i += 1) {
      const x = rand() * 512
      const y = rand() * 256
      const r = 4 + rand() * 26
      const shade = rand()
      ctx.fillStyle =
        shade < 0.5 ? `rgba(40,32,58,${0.12 + rand() * 0.25})` : `rgba(190,175,215,${0.1 + rand() * 0.2})`
      // Draw wrapped in x so the texture tiles seamlessly around the
      // sphere — otherwise a straight seam line appears on the planet.
      for (const dx of [-512, 0, 512]) {
        ctx.beginPath()
        ctx.arc(x + dx, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

const NEBULA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

function nebulaFragment(octaves) {
  return /* glsl */ `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uDensity;
    uniform float uWarm;
    uniform float uGlow;
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
            mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
        mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
            mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
        f.z);
    }
    float fbm(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < ${octaves}; i++) {
        v += a * noise(p);
        p *= 2.03;
        a *= 0.5;
      }
      return v;
    }
    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      uv.x *= 1.6;
      vec3 dir = normalize(vec3(uv, 1.2));
      float n = fbm(dir * 2.2 + vec3(0.0, 0.0, uTime * 0.015));
      float n2 = fbm(dir * 4.5 - vec3(0.0, 0.0, uTime * 0.01));
      float neb = smoothstep(0.35, 0.85, n * 0.7 + n2 * 0.3) * uDensity;
      vec3 deep = vec3(0.03, 0.02, 0.08);
      vec3 violet = vec3(0.70, 0.61, 1.0);
      vec3 warm = vec3(1.0, 0.62, 0.30);
      vec3 col = mix(deep, violet, neb);
      col = mix(col, warm, neb * uWarm * 0.6);
      float d = length(uv);
      col += vec3(1.0, 0.9, 0.7) * uGlow * exp(-d * d * 3.0) * 0.8;
      col *= 1.0 - d * 0.25;
      gl_FragColor = vec4(col, 1.0);
    }
  `
}

const STAR_VERT = /* glsl */ `
  attribute float aScale;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vTw;
  void main() {
    vTw = 0.6 + 0.4 * sin(uTime * 1.5 + aPhase);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aScale * uPixelRatio * (120.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`

const STAR_FRAG = /* glsl */ `
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vTw;
    gl_FragColor = vec4(0.85, 0.82, 1.0, a);
  }
`

const CONVERGE_VERT = /* glsl */ `
  attribute vec3 aScatter;
  attribute float aRandom;
  uniform float uConverge;
  varying float vA;
  void main() {
    vec3 center = vec3(0.0, 0.5, 0.0)
      + 0.35 * vec3(sin(aRandom * 17.0), cos(aRandom * 23.0), sin(aRandom * 29.0));
    vec3 pos = mix(aScatter, center, uConverge);
    vA = 0.4 + 0.6 * uConverge;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (1.5 + aRandom * 2.0) * (90.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`

const CONVERGE_FRAG = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vA;
    vec3 col = mix(vec3(0.70, 0.61, 1.0), vec3(1.0, 0.95, 0.85), vA);
    gl_FragColor = vec4(col, a);
  }
`

/**
 * Shared scroll state for the Canvas. progressRef is written by
 * ProgressBridge (raw scroll progress from Framer Motion); every
 * useFrame reads it — never React state per scroll frame (that would
 * re-render the whole tree every frame).
 */
function ProgressBridge({ scrollYProgress, progressRef }) {
  useFrame(() => {
    const v = scrollYProgress.get()
    progressRef.current = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0
  })
  return null
}

function CameraRig({ progressRef, lookRef }) {
  const { camera } = useThree()
  const smoothed = useRef(0)
  const posCurve = useMemo(
    () => new THREE.CatmullRomCurve3(CAM_POS.map((p) => new THREE.Vector3(...p)), false, 'centripetal'),
    [],
  )
  const lookCurve = useMemo(
    () => new THREE.CatmullRomCurve3(CAM_LOOK.map((p) => new THREE.Vector3(...p)), false, 'centripetal'),
    [],
  )
  const tmpPos = useMemo(() => new THREE.Vector3(), [])
  const tmpLook = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, delta) => {
    const target = progressRef.current
    if (!Number.isFinite(target)) return
    smoothed.current = THREE.MathUtils.damp(smoothed.current, target, 6, delta)
    if (!Number.isFinite(smoothed.current)) return
    const camT = cameraTForProgress(smoothed.current)
    posCurve.getPoint(camT, tmpPos)
    lookCurve.getPoint(camT, tmpLook)
    camera.position.copy(tmpPos)
    camera.lookAt(tmpLook)
    lookRef.current.copy(tmpLook)
  })
  return null
}

function NebulaBackground({ progressRef, reducedMotion, octaves }) {
  const meshRef = useRef(null)
  const matRef = useRef(null)
  const { camera } = useThree()
  // Uniforms object memoized once — inline uniforms would recompile the
  // shader on every render.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDensity: { value: 0.25 },
      uWarm: { value: 0 },
      uGlow: { value: 0.1 },
    }),
    [],
  )
  const frag = useMemo(() => nebulaFragment(octaves), [octaves])
  useFrame(({ clock }) => {
    if (!meshRef.current || !matRef.current) return
    // Recenter every frame so the camera can never leave the shell.
    meshRef.current.position.copy(camera.position)
    const p = progressRef.current
    matRef.current.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime
    matRef.current.uniforms.uDensity.value = sampleKeys(BOUNDS, UNIFORM_KEYS.density, p)
    matRef.current.uniforms.uWarm.value = sampleKeys(BOUNDS, UNIFORM_KEYS.warm, p)
    matRef.current.uniforms.uGlow.value = sampleKeys(BOUNDS, UNIFORM_KEYS.glow, p)
  })
  return (
    <mesh ref={meshRef} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[60, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={NEBULA_VERT}
        fragmentShader={frag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}

function Starfield({ progressRef, reducedMotion, count }) {
  const matRef = useRef(null)
  const geo = useMemo(() => {
    const rand = mulberry32(7)
    const pos = new Float32Array(count * 3)
    const scale = new Float32Array(count)
    const phase = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      // Shell radius 20–45, all around (background stars, kept always).
      const r = 20 + rand() * 25
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.cos(phi)
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      scale[i] = 0.5 + rand() * 1.2
      phase[i] = rand() * Math.PI * 2
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
    return g
  }, [count])
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: Math.min(2, window.devicePixelRatio || 1) } }),
    [],
  )
  useFrame(({ clock }) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime
  })
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={STAR_VERT}
        fragmentShader={STAR_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function ConvergeParticles({ progressRef, count }) {
  const groupRef = useRef(null)
  const matRef = useRef(null)
  const visibleRef = useRef(false)
  const geo = useMemo(() => {
    const rand = mulberry32(21)
    const pos = new Float32Array(count * 3)
    const scatter = new Float32Array(count * 3)
    const rnd = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      const r = 2 + rand() * 5
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      scatter[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      scatter[i * 3 + 1] = 0.5 + r * Math.cos(phi) * 0.6
      scatter[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      rnd[i] = rand()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    g.setAttribute('aRandom', new THREE.BufferAttribute(rnd, 1))
    return g
  }, [count])
  const uniforms = useMemo(() => ({ uConverge: { value: 0 } }), [])
  useFrame(() => {
    if (!groupRef.current || !matRef.current) return
    const p = progressRef.current
    // Hysteresis so the group does not flicker at the window edges.
    if (!visibleRef.current && p > 0.3 && p < 0.64) {
      visibleRef.current = true
      groupRef.current.visible = true
    } else if (visibleRef.current && (p < 0.28 || p > 0.66)) {
      visibleRef.current = false
      groupRef.current.visible = false
    }
    matRef.current.uniforms.uConverge.value = convergeForProgress(p)
  })
  return (
    <group ref={groupRef} visible={false}>
      <points geometry={geo} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={CONVERGE_VERT}
          fragmentShader={CONVERGE_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

function FlashSprite({ progressRef }) {
  const spriteRef = useRef(null)
  const tex = useGlowTexture()
  useFrame(() => {
    if (!spriteRef.current) return
    const f = flashForProgress(progressRef.current)
    spriteRef.current.material.opacity = f * 0.9
    const s = 1 + f * 7
    spriteRef.current.scale.set(s, s, 1)
    spriteRef.current.visible = f > 0.01
  })
  return (
    <sprite position={[0, 0.5, 0]} visible={false} ref={spriteRef}>
      <spriteMaterial
        map={tex}
        color="#ffffff"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  )
}

/** The single bright anchor particle the eye follows through all chapters. */
function HeroSprite({ lookRef }) {
  const spriteRef = useRef(null)
  const tex = useGlowTexture()
  useFrame(() => {
    if (!spriteRef.current) return
    spriteRef.current.position.copy(lookRef.current)
  })
  return (
    <sprite ref={spriteRef} scale={[0.5, 0.5, 1]}>
      <spriteMaterial
        map={tex}
        color="#d8ccff"
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  )
}

function PlanetGroup({ progressRef, reducedMotion }) {
  const groupRef = useRef(null)
  const moonRef = useRef(null)
  const planetRef = useRef(null)
  const visibleRef = useRef(false)
  const tex = usePlanetTexture()
  useFrame(() => {
    if (!groupRef.current) return
    const p = progressRef.current
    if (!visibleRef.current && p > 0.55 && p < 0.86) {
      visibleRef.current = true
      groupRef.current.visible = true
    } else if (visibleRef.current && (p < 0.53 || p > 0.88)) {
      visibleRef.current = false
      groupRef.current.visible = false
    }
    // Scroll-driven motion only — no idle drift, so reduced-motion needs
    // no special case here.
    const c = CHAPTERS[3]
    const local = Math.min(1, Math.max(0, (p - c.start) / (c.end - c.start)))
    const angle = local * Math.PI * 2 * 1.25
    if (moonRef.current) {
      moonRef.current.position.set(
        PLANET_POS[0] + Math.cos(angle) * 1.9,
        PLANET_POS[1] + Math.sin(angle * 0.7) * 0.5,
        PLANET_POS[2] + Math.sin(angle) * 1.9,
      )
    }
    if (planetRef.current) planetRef.current.rotation.y = p * 2
  })
  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={planetRef} position={PLANET_POS} castShadow={false}>
        <sphereGeometry args={[1.1, 48, 48]} />
        <meshStandardMaterial map={tex} roughness={0.9} metalness={0} />
      </mesh>
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color="#b8b8c0" roughness={1} />
      </mesh>
    </group>
  )
}

function FpsMeter({ showFps }) {
  const frames = useRef(0)
  const last = useRef(performance.now())
  useFrame(() => {
    if (!showFps) return
    frames.current += 1
    const now = performance.now()
    if (now - last.current >= 500) {
      const fps = Math.round((frames.current * 1000) / (now - last.current))
      const el = document.getElementById('fps-value')
      if (el) el.textContent = `${fps} FPS`
      frames.current = 0
      last.current = now
    }
  })
  return null
}

/**
 * ErrorBoundary cannot catch these: a lost WebGL context or a GLSL
 * compile failure on an unusual GPU only logs, leaving a black canvas.
 * This guard turns that silent failure into the visible fallback.
 */
function ContextGuard({ onLost }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    const lost = (e) => {
      e.preventDefault()
      onLost(true)
    }
    const restored = () => onLost(false)
    el.addEventListener('webglcontextlost', lost)
    el.addEventListener('webglcontextrestored', restored)
    return () => {
      el.removeEventListener('webglcontextlost', lost)
      el.removeEventListener('webglcontextrestored', restored)
    }
  }, [gl, onLost])
  return null
}

export default function NebulaScene({
  scrollYProgress,
  reducedMotion,
  isMobile,
  showFps,
  onCreated,
  onContextLost,
}) {
  const progressRef = useRef(0)
  const lookRef = useRef(new THREE.Vector3(0, 0.5, 0))
  const octaves = isMobile ? 3 : 4
  const dpr = isMobile ? [1, 1.5] : [1, 2]
  const starCount = isMobile ? 6000 : 20000
  const particleCount = isMobile ? 3000 : 8000

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0.6, 12], fov: 42 }}
      gl={{ antialias: true }}
      onCreated={onCreated}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 4]} intensity={1.2} />
      <ProgressBridge scrollYProgress={scrollYProgress} progressRef={progressRef} />
      <CameraRig progressRef={progressRef} lookRef={lookRef} />
      <NebulaBackground progressRef={progressRef} reducedMotion={reducedMotion} octaves={octaves} />
      <Starfield progressRef={progressRef} reducedMotion={reducedMotion} count={starCount} />
      <ConvergeParticles progressRef={progressRef} count={particleCount} />
      <FlashSprite progressRef={progressRef} />
      <HeroSprite lookRef={lookRef} />
      <PlanetGroup progressRef={progressRef} reducedMotion={reducedMotion} />
      <FpsMeter showFps={showFps} />
      <ContextGuard onLost={onContextLost} />
    </Canvas>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useGame } from '../game/store'
import { POIS, SHARDS, SECTOR_RADIUS, MISSIONS } from '../game/data'

function currentTarget(flight, missionIndex, moonScanned, shards) {
  if (missionIndex === 0) return { label: POIS.star.label, pos: POIS.star.pos }
  if (missionIndex === 1) {
    const next = SHARDS.find((s) => !shards.includes(s.id))
    return next ? { label: next.label, pos: next.pos } : null
  }
  if (missionIndex === 2) return { label: POIS.station.label, pos: POIS.station.pos }
  if (missionIndex === 3) {
    if (!moonScanned) {
      const mp = flight.moonPos
      return { label: POIS.moon.label, pos: [mp.x, 0, mp.z] }
    }
    return { label: POIS.planet.label, pos: POIS.planet.pos }
  }
  if (missionIndex === 4) return { label: POIS.gate.label, pos: POIS.gate.pos }
  return null
}

function Joystick({ flight }) {
  const zone = useRef(null)
  const knob = useRef(null)
  const state = useRef({ id: null, cx: 0, cy: 0 })

  const update = (clientX, clientY) => {
    const rect = zone.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = (clientX - cx) / 48
    let dy = (clientY - cy) / 48
    const len = Math.hypot(dx, dy)
    if (len > 1) {
      dx /= len
      dy /= len
    }
    flight.joy = { x: dx, y: dy, active: true }
    if (knob.current) knob.current.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`
  }

  const end = () => {
    state.current.id = null
    flight.joy = { x: 0, y: 0, active: false }
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)'
  }

  return (
    <div
      className="joystick-zone"
      ref={zone}
      onPointerDown={(e) => {
        state.current.id = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (state.current.id === e.pointerId) update(e.clientX, e.clientY)
      }}
      onPointerUp={end}
      onPointerCancel={end}
      role="application"
      aria-label="Cần lái: kéo lên để tăng tốc, kéo trái phải để rẽ"
    >
      <div className="joy-base" />
      <div className="joy-knob" ref={knob} />
      <div className="joy-label">Kéo để lái</div>
    </div>
  )
}

export function Hud({ flight, rocks, onScan, forceJoystick }) {
  const missionIndex = useGame((s) => s.missionIndex)
  const moonScanned = useGame((s) => s.moonScanned)
  const completed = useGame((s) => s.completed)
  const shards = useGame((s) => s.shards)
  const shield = useGame((s) => s.shield)
  const nearTarget = useGame((s) => s.nearTarget)
  const toast = useGame((s) => s.toast)
  const hitFlash = useGame((s) => s.hitFlash)
  const showFps = useGame((s) => s.showFps)
  const openReading = useGame((s) => s.openReading)
  const resetAll = useGame((s) => s.resetAll)
  const clearToast = useGame((s) => s.clearToast)

  const arrowRef = useRef(null)
  const distRef = useRef(null)
  const targetLabelRef = useRef(null)
  const radarRef = useRef(null)
  const [flash, setFlash] = useState(false)
  const [boostOn, setBoostOn] = useState(false)

  const mission = MISSIONS[Math.min(missionIndex, MISSIONS.length - 1)]
  const missionProgress =
    missionIndex === 1
      ? `Đã nhặt ${shards.length}/3 mảnh sao`
      : missionIndex === 3
        ? moonScanned
          ? 'Đã quét Mặt trăng, còn Hành tinh'
          : 'Hãy quét Mặt trăng trước'
        : `Đã hoàn thành ${completed.length}/5 nhiệm vụ`

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 3500)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  useEffect(() => {
    if (hitFlash === 0) return
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 160)
    return () => clearTimeout(t)
  }, [hitFlash])

  // Navigation loop: arrow + distance + radar, all via refs (no React state per frame).
  useEffect(() => {
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const st = useGame.getState()
      const target = currentTarget(flight, st.missionIndex, st.moonScanned, st.shards)
      const fx = Math.sin(flight.heading)
      const fz = Math.cos(flight.heading)
      if (arrowRef.current && distRef.current && targetLabelRef.current) {
        if (target) {
          const dx = target.pos[0] - flight.pos.x
          const dz = target.pos[2] - flight.pos.z
          const bearing = Math.atan2(dx, dz)
          const rel = bearing - flight.heading
          arrowRef.current.style.transform = `rotate(${-rel}rad)`
          distRef.current.textContent = `${Math.round(Math.hypot(dx, dz))} đơn vị`
          targetLabelRef.current.textContent = target.label
        } else {
          arrowRef.current.style.transform = 'rotate(0rad)'
          distRef.current.textContent = '—'
          targetLabelRef.current.textContent = 'Không còn mục tiêu'
        }
      }
      const canvas = radarRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        const S = 150
        const scale = 70 / SECTOR_RADIUS
        ctx.clearRect(0, 0, S, S)
        ctx.strokeStyle = 'rgba(179,155,255,0.35)'
        ctx.beginPath()
        ctx.arc(75, 75, 70, 0, Math.PI * 2)
        ctx.stroke()
        const plot = (x, z, color, r) => {
          const sx = 75 + (x - flight.pos.x) * scale
          const sy = 75 + (z - flight.pos.z) * scale
          if (Math.hypot(sx - 75, sy - 75) > 70) return
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(sx, sy, r, 0, Math.PI * 2)
          ctx.fill()
        }
        plot(POIS.star.pos[0], POIS.star.pos[2], '#ffd9a0', 3.5)
        plot(POIS.station.pos[0], POIS.station.pos[2], '#7ee7ff', 3.5)
        plot(POIS.planet.pos[0], POIS.planet.pos[2], '#b39bff', 4.5)
        plot(POIS.gate.pos[0], POIS.gate.pos[2], '#ff9d5c', 3.5)
        for (const sh of SHARDS) {
          if (!st.shards.includes(sh.id)) plot(sh.pos[0], sh.pos[2], '#ffc978', 2.5)
        }
        for (const rock of rocks) {
          const d = Math.hypot(rock.pos[0] - flight.pos.x, rock.pos[2] - flight.pos.z)
          if (d < 60) plot(rock.pos[0], rock.pos[2], 'rgba(180,180,190,0.7)', 1.6)
        }
        // Ship triangle, rotated by heading (screen up = -Z, forward (sin, cos)).
        ctx.save()
        ctx.translate(75, 75)
        ctx.rotate(Math.PI - flight.heading)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(0, -7)
        ctx.lineTo(5, 6)
        ctx.lineTo(-5, 6)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
        // Target ring
        if (target) {
          const sx = 75 + (target.pos[0] - flight.pos.x) * scale
          const sy = 75 + (target.pos[2] - flight.pos.z) * scale
          if (Math.hypot(sx - 75, sy - 75) <= 70) {
            ctx.strokeStyle = '#ffc978'
            ctx.beginPath()
            ctx.arc(sx, sy, 6, 0, Math.PI * 2)
            ctx.stroke()
          }
        }
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [flight, rocks])

  const coarse =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const showJoystick = forceJoystick || coarse

  return (
    <div className="hud">
      <div className={`hit-flash ${flash ? 'on' : ''}`} />
      <div className="hud-header">
        <div className="brand">
          <div className="brand-name">NEBULA VOYAGE</div>
          <div className="brand-sub">Phạm Hà Đắc Dũng</div>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={openReading}>Đọc hành trình</button>
          <button className="btn" onClick={resetAll}>Chơi lại</button>
        </div>
      </div>

      <div className="mission-card">
        <div className="mission-kicker">NHIỆM VỤ {Math.min(missionIndex + 1, 5)} / 5</div>
        <div className="mission-title">{mission.title}</div>
        <div className="mission-desc">{mission.goal}</div>
        <div className="mission-progress">{missionProgress}</div>
        <div className="shield-row">
          <span className="shield-label">Khiên</span>
          <div className="shield-bar">
            <div className="shield-fill" style={{ width: `${shield}%` }} />
          </div>
          <span className="shield-value">{Math.round(shield)}%</span>
        </div>
      </div>

      <div className="nav-cluster">
        <div className="arrow-box">
          <div className="arrow-glyph" ref={arrowRef}>↑</div>
          <div className="arrow-dist" ref={distRef}>—</div>
        </div>
        <div className="radar">
          <canvas ref={radarRef} width={150} height={150} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          Tới: <span ref={targetLabelRef} style={{ color: 'var(--text)' }}>—</span>
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: 'absolute',
            top: '46%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--panel)',
            border: '1px solid var(--panel-border)',
            borderRadius: 12,
            padding: '10px 16px',
            fontSize: 14,
            textAlign: 'center',
            maxWidth: 'min(480px, 90vw)',
          }}
        >
          {toast}
        </div>
      )}

      <div className="action-buttons">
        {nearTarget && nearTarget.kind === 'scan' && (
          <button className="scan-btn" onClick={onScan}>
            Quét {nearTarget.label} (E)
          </button>
        )}
        <button
          className={`boost-btn ${boostOn ? 'active' : ''}`}
          onPointerDown={() => {
            flight.boost = true
            setBoostOn(true)
          }}
          onPointerUp={() => {
            flight.boost = false
            setBoostOn(false)
          }}
          onPointerLeave={() => {
            flight.boost = false
            setBoostOn(false)
          }}
        >
          Boost (Shift)
        </button>
      </div>

      {showJoystick && <Joystick flight={flight} />}

      <div className="controls-hint">
        <b>W</b> tăng tốc · <b>S</b> phanh · <b>A/D</b> rẽ · <b>Shift</b> boost · <b>E</b> quét · <b>F</b> hiện FPS · kéo chuột xoay camera
      </div>

      {showFps && (
        <div className="fps-badge">
          FPS: <span id="fps-value">--</span>
        </div>
      )}
    </div>
  )
}

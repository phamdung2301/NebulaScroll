import { useMemo, useRef, useState } from 'react'
import { useMotionValueEvent, useScroll } from 'framer-motion'
import NebulaScene from './components/NebulaScene.jsx'
import StoryOverlay, { scrollToProgress } from './components/StoryOverlay.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { TOTAL_VH, chapterIndexFor } from './data/story.js'

const PORTFOLIO_URL = 'https://portfolio-one-rust-99.vercel.app/'

export default function App() {
  const targetRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: targetRef })
  const [activeChapter, setActiveChapter] = useState(0)
  const [ready, setReady] = useState(false)
  const [contextLost, setContextLost] = useState(false)
  const [showFps, setShowFps] = useState(false)

  // Active chapter changes only on boundary crossings — never per frame.
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const i = chapterIndexFor(v)
    setActiveChapter((prev) => (prev === i ? prev : i))
  })

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const isMobile = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches),
    [],
  )

  return (
    <div className="app">
      {/* Fixed 3D stage. No OrbitControls on purpose: one finger drag must
          scroll the page on mobile, never rotate the camera. */}
      <div className={`stage${ready ? ' ready' : ''}`}>
        <ErrorBoundary fallbackText="Không mở được khung 3D trên thiết bị này. Thử trình duyệt có hỗ trợ WebGL.">
          <NebulaScene
            scrollYProgress={scrollYProgress}
            reducedMotion={reducedMotion}
            isMobile={isMobile}
            showFps={showFps}
            onCreated={() => setReady(true)}
            onContextLost={setContextLost}
          />
        </ErrorBoundary>
        {contextLost && (
          <div className="stage-fallback">
            <strong>WebGL bị gián đoạn.</strong>
            <span>Trình duyệt đã thu hồi bối cảnh 3D (thường do hết bộ nhớ GPU).</span>
            <button onClick={() => window.location.reload()}>Tải lại trang</button>
          </div>
        )}
      </div>

      {/* The 700vh scroll content that drives the whole story. */}
      <div ref={targetRef} className="scroll-root">
        <StoryOverlay
          scrollYProgress={scrollYProgress}
          activeChapter={activeChapter}
          reducedMotion={reducedMotion}
          showFps={showFps}
          onToggleFps={() => setShowFps((v) => !v)}
          onReplay={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          portfolioUrl={PORTFOLIO_URL}
        />
        <footer className="footer">
          Nebula Scroll Story — câu chuyện hư cấu · React Three Fiber + GLSL ·
          Cuộn để đi hết hành trình
        </footer>
      </div>

      {showFps && (
        <div className="fps-note">
          FPS đo trực tiếp trên máy của bạn — không phải con số quảng cáo.
        </div>
      )}
    </div>
  )
}

import { useEffect } from 'react'
import { motion, useTransform } from 'framer-motion'
import { CHAPTERS, TOTAL_VH, chapterIndexFor } from '../data/story.js'

/**
 * One chapter's text. Opacity/y are driven by Framer Motion transforms
 * attached straight to style — no React re-render per scroll frame.
 * Under reduced-motion the text cuts in/out with no fade (spec decision).
 */
function ChapterText({ chapter, scrollYProgress, reducedMotion, isActive }) {
  const w = chapter.end - chapter.start
  // Chapter 1 starts at scroll 0 = page load, so it must be visible
  // immediately: no fade-in for it (fade-out only). Other chapters fade
  // in during the first 25% of their range. Found by screenshot: at load
  // the opening text was invisible (opacity 0 at progress 0).
  const isFirst = chapter.start === 0
  const opacityInputs = reducedMotion
    ? [chapter.start - 0.001, chapter.start, chapter.end, chapter.end + 0.001]
    : isFirst
      ? [0, chapter.end - w * 0.15, chapter.end]
      : [chapter.start, chapter.start + w * 0.25, chapter.end - w * 0.15, chapter.end]
  const opacityOutputs = reducedMotion ? [0, 1, 1, 0] : isFirst ? [1, 1, 0] : [0, 1, 1, 0]
  const opacity = useTransform(scrollYProgress, opacityInputs, opacityOutputs)
  const y = useTransform(
    scrollYProgress,
    reducedMotion
      ? [chapter.start - 0.001, chapter.start, chapter.end, chapter.end + 0.001]
      : isFirst
        ? [0, chapter.end - w * 0.15, chapter.end]
        : [chapter.start, chapter.start + w * 0.25, chapter.end - w * 0.15, chapter.end],
    reducedMotion ? [0, 0, 0, 0] : isFirst ? [0, 0, -24] : [24, 0, 0, -24],
  )
  return (
    <motion.div
      className="chapter-text"
      style={{ opacity, y }}
      aria-hidden={!isActive}
    >
      <div className="chapter-no">Chương {chapter.no} / 5</div>
      <h2>{chapter.title}</h2>
      <p>{chapter.body}</p>
      {chapter.id === 'dark' && <div className="scroll-cue">Cuộn xuống ↓</div>}
    </motion.div>
  )
}

export function scrollToProgress(frac) {
  const max = document.documentElement.scrollHeight - window.innerHeight
  window.scrollTo({ top: Math.max(0, frac * max), behavior: 'smooth' })
}

/** CTA row fades with the C5 text (same opacity window, not always visible). */
function CtaRow({ scrollYProgress, reducedMotion, onReplay, portfolioUrl }) {
  const c = CHAPTERS[CHAPTERS.length - 1]
  const w = c.end - c.start
  const opacity = useTransform(
    scrollYProgress,
    reducedMotion
      ? [c.start - 0.001, c.start, c.end, c.end + 0.001]
      : [c.start, c.start + w * 0.25, c.end - w * 0.15, c.end],
    [0, 1, 1, 0],
  )
  return (
    <motion.div className="cta-row" style={{ opacity }}>
      <a className="cta primary" href={portfolioUrl}>
        Về portfolio
      </a>
      <button className="cta secondary" onClick={onReplay}>
        Xem lại hành trình
      </button>
    </motion.div>
  )
}

export default function StoryOverlay({
  scrollYProgress,
  activeChapter,
  reducedMotion,
  showFps,
  onToggleFps,
  onReplay,
  portfolioUrl,
}) {
  // Keyboard chapter jumps (native Space scrolling is left alone).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        scrollToProgress(CHAPTERS[Math.min(activeChapter + 1, CHAPTERS.length - 1)].start + 0.01)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        scrollToProgress(CHAPTERS[Math.max(activeChapter - 1, 0)].start + 0.01)
      } else if (e.key === 'Home') {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (e.key === 'End') {
        e.preventDefault()
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeChapter])

  return (
    <>
      {/* Full story text for screen readers, in story order. The visual
          chapter texts are aria-hidden when inactive (see ChapterText). */}
      <div className="visually-hidden">
        {CHAPTERS.map((c) => (
          <p key={c.id}>
            Chương {c.no}: {c.title}. {c.body}
          </p>
        ))}
      </div>

      {/* Segmented progress rail (top) + chapter dots (right). */}
      <div className="rail" aria-hidden="true">
        {CHAPTERS.map((c, i) => (
          <div key={c.id} className={`rail-seg${i === activeChapter ? ' active' : ''}`} />
        ))}
      </div>
      <nav className="dots" aria-label="Chuyển chương">
        {CHAPTERS.map((c, i) => (
          <button
            key={c.id}
            className={`dot${i === activeChapter ? ' active' : ''}`}
            aria-label={`Chương ${c.no}: ${c.title}`}
            aria-current={i === activeChapter ? 'true' : undefined}
            onClick={() => scrollToProgress(c.start + 0.01)}
          />
        ))}
      </nav>

      {/* Chapter sections: the 700vh scroll content itself. */}
      {CHAPTERS.map((c) => (
        <section
          key={c.id}
          className="chapter-section"
          style={{ height: `${(c.end - c.start) * TOTAL_VH}vh` }}
        >
          <div className="chapter-sticky">
            <ChapterText
              chapter={c}
              scrollYProgress={scrollYProgress}
              reducedMotion={reducedMotion}
              isActive={activeChapter === CHAPTERS.indexOf(c)}
            />
            {c.id === 'dawn' && (
              <CtaRow
                scrollYProgress={scrollYProgress}
                reducedMotion={reducedMotion}
                onReplay={onReplay}
                portfolioUrl={portfolioUrl}
              />
            )}
          </div>
        </section>
      ))}

      {showFps && (
        <div className="fps-badge">
          <span id="fps-value">— FPS</span>
        </div>
      )}
      <button className="fps-toggle" onClick={onToggleFps}>
        {showFps ? 'Tắt FPS' : 'Hiện FPS'}
      </button>
    </>
  )
}

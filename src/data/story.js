/**
 * Nebula Scroll Story — single source of truth for the story.
 *
 * The story is FICTIONAL. Copy is Vietnamese (matching the portfolio data,
 * which is Vietnamese, not English). Total copy is kept under ~200 words so
 * every chapter stays readable while scrolling.
 *
 * Scroll layout: 700vh total, weighted per chapter (not equal slices).
 * Progress values below are fractions of the whole scroll (0..1).
 */

export const TOTAL_VH = 700

const BOUNDS = [0, 100, 250, 400, 550, 700]

export const CHAPTERS = [
  {
    id: 'dark',
    no: 1,
    title: 'Bóng tối',
    body: 'Trước ánh sáng, chỉ có bụi. Một đám mây lạnh trôi giữa khoảng không.',
    start: BOUNDS[0] / TOTAL_VH,
    end: BOUNDS[1] / TOTAL_VH,
  },
  {
    id: 'wake',
    no: 2,
    title: 'Tinh vân thức giấc',
    body: 'Bụi bắt đầu xoáy. Những sợi màu đầu tiên hiện ra trong bóng tối.',
    start: BOUNDS[1] / TOTAL_VH,
    end: BOUNDS[2] / TOTAL_VH,
  },
  {
    id: 'birth',
    no: 3,
    title: 'Suýt nữa thì không',
    body: 'Nó co lại, rồi lịm đi một nhịp. Rồi nó bật lên — không nổ, chỉ sáng.',
    start: BOUNDS[2] / TOTAL_VH,
    end: BOUNDS[3] / TOTAL_VH,
  },
  {
    id: 'world',
    no: 4,
    title: 'Nơi để tới',
    body: 'Lần đầu tiên, ánh sáng có một thế giới để chiếu tới. Bình minh đầu tiên.',
    start: BOUNDS[3] / TOTAL_VH,
    end: BOUNDS[4] / TOTAL_VH,
  },
  {
    id: 'dawn',
    no: 5,
    title: 'Bình minh',
    body: 'Năm chương. Một lần cuộn. Dựng bằng React Three Fiber.',
    start: BOUNDS[4] / TOTAL_VH,
    end: BOUNDS[5] / TOTAL_VH,
  },
]

export function chapterIndexFor(p) {
  for (let i = CHAPTERS.length - 1; i >= 0; i -= 1) {
    if (p >= CHAPTERS[i].start) return i
  }
  return 0
}

/** Camera keyframes at each chapter boundary (position + lookAt target). */
export const CAM_POS = [
  [0, 0.6, 12],
  [0, 0.8, 8.5],
  [-2.5, 1.2, 5.5],
  [0, 0.5, 4.2],
  [3.5, 1.0, 3.5],
  [0, 2.4, 13.5],
]

export const CAM_LOOK = [
  [0, 0.5, 0],
  [0, 0.5, 0],
  [-0.5, 0.6, 0],
  [0, 0.5, 0],
  [3.5, 0.5, -1.5],
  [0, 0.5, 0],
]

export const PLANET_POS = [3.5, 0.5, -1.5]

/** Piecewise-linear sampling of keyframed values at chapter boundaries. */
export function sampleKeys(stops, values, p) {
  if (p <= stops[0]) return values[0]
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (p <= stops[i + 1]) {
      const t = (p - stops[i]) / (stops[i + 1] - stops[i])
      return values[i] + (values[i + 1] - values[i]) * t
    }
  }
  return values[values.length - 1]
}

const B = BOUNDS.map((v) => v / TOTAL_VH)

/** Nebula shader uniforms keyframed at chapter boundaries. */
export const UNIFORM_KEYS = {
  density: [0.25, 0.45, 0.7, 1.0, 0.6, 0.8],
  warm: [0.0, 0.05, 0.35, 0.15, 0.1, 0.75],
  glow: [0.1, 0.2, 0.4, 1.0, 0.5, 0.7],
}

function smoothstep(t) {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/**
 * Transition/dwell mapping: within each chapter, the camera moves during
 * the first 40% of the chapter range (transition) and holds during the
 * remaining 60% (dwell, so the reader can read in peace).
 * Input: raw scroll progress 0..1. Output: camera-curve parameter 0..1.
 */
export function cameraTForProgress(p) {
  const clamped = Math.min(1, Math.max(0, p))
  for (let i = 0; i < CHAPTERS.length; i += 1) {
    const c = CHAPTERS[i]
    if (clamped <= c.end || i === CHAPTERS.length - 1) {
      const local = (clamped - c.start) / (c.end - c.start)
      const moved = smoothstep(local / 0.4)
      return c.start + (c.end - c.start) * moved
    }
  }
  return clamped
}

/**
 * C3 convergence with the "almost failed" beat: rises to 0.85, dips to
 * 0.6 (the light falters), then completes to 1.0 (it switches on).
 */
export function convergeForProgress(p) {
  const c = CHAPTERS[2]
  if (p <= c.start) return 0
  if (p >= c.end) return 1
  const t = (p - c.start) / (c.end - c.start)
  if (t < 0.6) return (t / 0.6) * 0.85
  if (t < 0.75) return 0.85 - ((t - 0.6) / 0.15) * 0.25
  return 0.6 + ((t - 0.75) / 0.25) * 0.4
}

/** Flash spike peaking exactly at the end of C3. */
export function flashForProgress(p) {
  const end = CHAPTERS[2].end
  if (p < end - 0.02 || p > end + 0.06) return 0
  if (p <= end) return (p - (end - 0.02)) / 0.02
  return 1 - (p - end) / 0.06
}

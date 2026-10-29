# Nebula Scroll Story

A scroll-driven story in five chapters: a fictional journey of light
through a nebula, told by scrolling. The camera flies a Catmull-Rom path
while a custom GLSL nebula shader, converging particles, a planet and its
moon respond to scroll progress.

## What it is (and is not)

- **It is:** a real scrollytelling demo built to replace a placeholder
  project card on a portfolio. The story is fictional; the copy is
  Vietnamese, matching the portfolio data.
- **It is not:** a client project, and it makes no performance claims.
  Use the built-in FPS meter to measure on your own device.
- **Performance budget:** ~5–8 draw calls, no realtime shadow maps,
  no Bloom post-processing, no scroll-jacking, native scroll only.

## Stack

- Vite + React 19 + React Three Fiber + drei + Framer Motion
- Custom GLSL: fbm nebula background (4 octaves desktop / 3 mobile,
  fixed at load — never recompiled at runtime), shader-morphed particles
- Scroll progress lives in a mutable ref / motion value, never React
  state per frame; chapter text uses Framer Motion transforms attached
  directly to style

## The story (5 chapters, 700vh weighted)

1. **Bóng tối** (100vh) — dark space, sparse stars, slow dolly + scroll cue
2. **Tinh vân thức giấc** (150vh) — fbm nebula wakes, filaments, violet → amber
3. **Suýt nữa thì không** (150vh) — particles converge, falter (dip), then
   switch on with an additive flash (no Bloom)
4. **Nơi để tới** (150vh) — first solid body: a planet with a baked canvas
   texture + an orbiting moon; the emotional peak
5. **Bình minh** (150vh) — pull back to a wide view, restrained light,
   CTA: back to portfolio (primary), replay (secondary)

Each chapter splits 40% transition (camera moves, text fades in) /
60% dwell (camera holds, text at 100%). Chapters are self-contained so
fast flick-scrolling past one never breaks the story.

## Controls

- Scroll (native, touch + wheel) — the story
- Chapter dots (right edge, real `<button>`s) + ArrowUp/Down, PageUp/Down,
  Home/End — jump between chapters
- FPS meter toggle (bottom-right, off by default)

## Accessibility & resilience

- `prefers-reduced-motion`: scroll-driven camera stays (user-initiated),
  but all idle motion freezes (shader time, twinkle, flashes) and chapter
  text cuts in/out with no fade
- Full story text available as a visually-hidden block in story order
  for screen readers; inactive visual chapters are `aria-hidden`
- WebGL failure → ErrorBoundary fallback; lost WebGL context →
  `webglcontextlost` fallback + reload (ErrorBoundary cannot catch this)
- Mobile tiers: fewer shader octaves, lower dpr, fewer particles
  (desktop ~20k stars / 8k converge particles, mobile ~6k / 3k)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the production build locally
```

## Project layout

```
src/
├── data/story.js             # chapters, copy, camera keyframes, progress math
├── components/
│   ├── NebulaScene.jsx       # canvas, nebula shader, stars, particles, planet, camera rig, FPS
│   ├── StoryOverlay.jsx      # chapters, dots, progress rail, CTA, keyboard jumps
│   └── ErrorBoundary.jsx     # render-phase failure fallback
└── App.jsx                   # fixed stage + 700vh scroll root
```

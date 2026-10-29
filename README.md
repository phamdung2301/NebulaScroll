# Nebula Voyage — Space Exploration Game

Fly a small survey ship freely through a nebula sector. Visit beacons, scan them to unlock
story fragments, collect star shards, cross the asteroid belt, and reach the dawn gate.

This replaces the earlier scroll-driven Nebula Scroll Story (kept in git history).

## Controls

- **Desktop:** W accelerate, S brake, A/D steer, Shift boost, E scan, F toggle FPS meter,
  drag with the mouse to orbit the camera around the ship.
- **Mobile:** virtual joystick (left) to steer, Scan button (appears near a beacon),
  Boost button.
- **Reduced motion / no-fly reading:** "Đọc hành trình" opens the full story as text.

## Missions

1. First flight — fly to the Young Star and scan it.
2. Star shards — collect 3 shards scattered across the nebula.
3. Asteroid belt — cross the belt, scan the Derelict Station (hits cost shield).
4. First world — scan the Moon, then the Planet.
5. Dawn — fly to the Dawn Gate to finish; the completion screen links back to the portfolio.

Progress (completed missions, collected shards) persists in `localStorage`
(`nebula-voyage-progress-v1`); shield regenerates after 4s without a hit.

## Tech

Vite + React 19 + React Three Fiber + three + zustand. No drei, no framer-motion
(deliberate bundle diet: the previous build's 1.3 MB single chunk was part of the UX
feedback that motivated this rebuild).

- Ship physics lives in a mutable ref updated in `useFrame`; React state only changes
  on game events (scan, collect, hit, mission complete).
- Performance: antialias off, dpr capped at 1.75, adaptive pixel-ratio step-down when
  FPS stays under 45, code-split three chunk.
- Verification-only query params: `?demo=panel` (open NV1 story panel),
  `?demo=done` (completion screen), `?demo=joystick` (force joystick visible).

## Develop

```bash
npm install
npm run dev
npm run build
npm run preview
```

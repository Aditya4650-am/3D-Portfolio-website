# 3D Portfolio Website — Cinematic Scroll + Glassmorphism

A fullscreen, scroll-controlled cinematic frame animation — 240 WebP frames
(`frame_000001.webp` → `frame_000240.webp`) driven directly by scroll position —
with Aditya Mandwal's complete portfolio rendered over it as **3D glassmorphism**
panels and buttons. The hero sits on frame 1, the footer lands on frame 240, and
the sequence advances linearly across every section in between, always moving
behind the glass. Frames ship at 1440×810 (Lanczos-upscaled + unsharp-passed by
`scripts/enhance-frames.py`, since the 640×360 source looked blurry at fullscreen
scale).

## Stack

- [Vite](https://vitejs.dev) + TypeScript
- [GSAP](https://gsap.com) + ScrollTrigger (scrub, pin)
- [Lenis](https://lenis.darkroom.engineering) smooth scrolling, synced with the
  GSAP ticker (one unified animation loop)
- HTML Canvas with 16:9 cover rendering, DPR capped (2 desktop / 1.5 mobile)

## Run

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## How it works

- `public/frames/` holds the 240 enhanced WebP frames at 1440×810 (originals
  remain inside `portfolio_frames_webp_max10mb.zip`; regenerate with
  `npm run enhance:frames`).
- `#video-scroll` wraps a CSS `position: sticky` fullscreen canvas stage plus a
  `.content` layer. The hero panel is visible from frame 1; every portfolio
  section (data from am46-dev.vercel.app) then scrolls over the still-animating
  frames as glass panels that blur the live canvas behind them, ending in a
  glass footer on frame 240.
- GSAP ScrollTrigger (`scrub: true`, `ease: "none"`) maps scroll progress
  linearly to the frame counter across the whole page.
- Glass system: alpha-gradient surfaces, gradient hairline borders
  (mask-composite), specular sheen + film grain, blur(16px) saturate(160%),
  layered shadows, `prefers-contrast` fallback, and lighter glass on mobile.
- Scroll down → frames 1 → 240. Scroll up → frames 240 → 1. Perfectly
  reversible, frame-accurate (`Math.round`), redraws only on frame change.
- Frames are preloaded once into an image cache — first frame, then a
  coarse-to-fine pass (nearby frames early) — never re-downloaded or re-decoded
  during scrolling. `ScrollTrigger.refresh()` runs once everything is loaded.
- Project filter buttons, Lenis-smoothed anchor links, subtle glass entrance
  reveals, and a contact form that opens the visitor's email client are wired
  in `src/main.ts`.
- `prefers-reduced-motion: reduce` disables the animation and shows
  `frame_000001.webp` as a static fullscreen image behind the sections.

## Tests

```bash
npm test
```

- `test/frames.test.mjs` — 240 frames, sequential naming, 1440×810, payload cap.
- `test/structural.test.mjs` — anchors resolve, filters cover all project
  categories, all portfolio data present, no external render assets.
- `test/wiring.test.mjs` — bundles `src/main.ts` with stubbed gsap/lenis and
  runs it in jsdom against the real markup: first-frame painting, DPR canvas
  sizing, Lenis anchor scrolling, project filtering, mailto composition,
  resize handling, and the reduced-motion fallback.

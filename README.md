# 3D Portfolio Website — Cinematic Scroll Animation

A fullscreen, scroll-controlled cinematic frame animation. The page shows
**only** a black background and a canvas playing a 240-frame WebP sequence
(`frame_000001.webp` → `frame_000240.webp`) driven directly by scroll position.
No autoplay, no text, no UI.

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

- `public/frames/` holds the 240 WebP frames (640×360, extracted once from
  `portfolio_frames_webp_max10mb.zip`; the ZIP is kept as the source asset).
- `#video-scroll` is a `500vh` section; GSAP pins it and maps scroll progress
  to a frame counter (`frameState.frame`, `ease: "none"`, `scrub: true`).
- Scroll down → frames 1 → 240. Scroll up → frames 240 → 1. Perfectly
  reversible, frame-accurate (`Math.round`), redraws only on frame change.
- Frames are preloaded once into an image cache — first frame, then a
  coarse-to-fine pass (nearby frames early) — never re-downloaded or re-decoded
  during scrolling. `ScrollTrigger.refresh()` runs once everything is loaded.
- `prefers-reduced-motion: reduce` disables the animation and shows
  `frame_000001.webp` as a static fullscreen image.

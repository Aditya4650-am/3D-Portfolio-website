# 3D Portfolio Website — Cinematic Scroll + Glassmorphism

A fullscreen, scroll-controlled cinematic frame animation — 240 WebP frames
(`frame_000001.webp` → `frame_000240.webp`) driven directly by scroll position —
with Aditya Mandwal's portfolio sections scrolling over it as **3D glassmorphism**
panels and buttons. The frames never stop being the background: the canvas is a
sticky stage behind every section, and the sequence keeps advancing until the
page ends exactly on frame 240.

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
- `#video-scroll` wraps a CSS `position: sticky` fullscreen canvas stage plus a
  `.content` layer. A `400vh` intro gives the pure cinematic scroll first; the
  portfolio sections (data copied from am46-dev.vercel.app) then scroll over
  the still-animating frames as glass panels that blur the live canvas behind
  them.
- GSAP ScrollTrigger (`scrub: true`, `ease: "none"`) maps scroll progress to
  the frame counter via a two-phase timeline: frames 1–200 across the intro,
  frames 200–240 slowly across the sections — so the background keeps moving
  and the page still ends exactly on frame 240.
- Scroll down → frames 1 → 240. Scroll up → frames 240 → 1. Perfectly
  reversible, frame-accurate (`Math.round`), redraws only on frame change.
- Frames are preloaded once into an image cache — first frame, then a
  coarse-to-fine pass (nearby frames early) — never re-downloaded or re-decoded
  during scrolling. `ScrollTrigger.refresh()` runs once everything is loaded.
- Project filter buttons, Lenis-smoothed anchor links, and a contact form that
  opens the visitor's email client are wired in `src/main.ts`.
- `prefers-reduced-motion: reduce` disables the animation and shows
  `frame_000001.webp` as a static fullscreen image behind the sections.

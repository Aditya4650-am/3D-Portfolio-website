import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import "./style.css";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const FRAME_COUNT = 240;
const FRAME_URL = (index: number) =>
  `/frames/frame_${String(index + 1).padStart(6, "0")}.webp`;

const section = document.getElementById("video-scroll") as HTMLElement;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;

const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
const isSmallViewport = window.matchMedia("(max-width: 768px)").matches;
const isMobile = isCoarsePointer || isSmallViewport;

/* Cap the device pixel ratio: 2 on desktop, ~1.5 on mobile. */
const DPR_CAP = isMobile ? 1.5 : 2;

/* ------------------------------------------------------------------ */
/* Canvas state (mutable, outside of any UI framework — no re-renders) */
/* ------------------------------------------------------------------ */

const frameState = { frame: 0 };
const images: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);

let lastDrawnFrame = -1;

/* ------------------------------------------------------------------ */
/* Canvas sizing — retina sharp, DPR capped, responsive                */
/* ------------------------------------------------------------------ */

function sizeCanvas(): void {
  const cssWidth = Math.max(1, window.innerWidth);
  const cssHeight = Math.max(1, window.innerHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);

  const targetWidth = Math.round(cssWidth * dpr);
  const targetHeight = Math.round(cssHeight * dpr);

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    lastDrawnFrame = -1; // force a redraw at the new size
  }
}

/* ------------------------------------------------------------------ */
/* Rendering — 16:9 cover, never stretched, redraw only on change      */
/* ------------------------------------------------------------------ */

function drawFrame(image: HTMLImageElement): void {
  const imageWidth = image.naturalWidth;
  const imageHeight = image.naturalHeight;
  if (!imageWidth || !imageHeight) return;

  const viewWidth = canvas.width;
  const viewHeight = canvas.height;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  /* Cover: crop the source so the 16:9 image fills the viewport
     without distortion. Extra pixels are cropped, never stretched. */
  const viewportAspect = viewWidth / viewHeight;
  const imageAspect = imageWidth / imageHeight;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = imageWidth;
  let sourceHeight = imageHeight;

  if (viewportAspect > imageAspect) {
    /* Viewport is wider than the image: crop vertically. */
    sourceHeight = imageWidth / viewportAspect;
    sourceY = (imageHeight - sourceHeight) / 2;
  } else {
    /* Viewport is taller than the image: crop horizontally. */
    sourceWidth = imageHeight * viewportAspect;
    sourceX = (imageWidth - sourceWidth) / 2;
  }

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, viewWidth, viewHeight);
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    viewWidth,
    viewHeight
  );
}

function renderFrame(force = false): void {
  const frameIndex = Math.round(frameState.frame);
  const image = images[frameIndex];

  /* Gracefully skip frames that are still loading. */
  if (!image || !image.complete) return;

  /* Redraw only when the frame actually changes. */
  if (!force && frameIndex === lastDrawnFrame) return;

  drawFrame(image);
  lastDrawnFrame = frameIndex;
}

/* ------------------------------------------------------------------ */
/* Preloading — frame 1 first, then nearby frames, then the rest       */
/* ------------------------------------------------------------------ */

/* Coarse-to-fine order: an early coarse pass makes scrubbing usable
   almost immediately, later passes fill in the neighbors. */
function buildLoadOrder(): number[] {
  const order: number[] = [];
  const queued = new Set<number>();

  for (let step = 8; step >= 1; step = Math.floor(step / 2)) {
    for (let i = 0; i < FRAME_COUNT; i += step) {
      if (!queued.has(i)) {
        queued.add(i);
        order.push(i);
      }
    }
  }
  for (let i = 0; i < FRAME_COUNT; i++) {
    if (!queued.has(i)) order.push(i);
  }
  return order;
}

async function loadFrame(index: number): Promise<boolean> {
  const image = new Image();
  image.decoding = "async";
  images[index] = image; // exactly one Image per frame, never re-created

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`frame ${index} failed`));
      image.src = FRAME_URL(index);
    });
    if ("decode" in image) {
      await image.decode().catch(() => undefined); // decode once, off the scroll path
    }
    return true;
  } catch {
    return false; // renderFrame skips missing frames instead of flickering
  }
}

async function preloadFrames(
  onFirstFrame: () => void,
  onComplete: () => void
): Promise<void> {
  const order = buildLoadOrder();
  const concurrency = isMobile ? 4 : 6;
  let cursor = 0;
  let firstFrameShown = false;

  const worker = async (): Promise<void> => {
    while (cursor < order.length) {
      const index = order[cursor++];
      const loaded = await loadFrame(index);
      if (!firstFrameShown && loaded && index === 0) {
        firstFrameShown = true;
        onFirstFrame();
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, order.length) }, worker)
  );

  if (!firstFrameShown && images[0]?.complete) {
    onFirstFrame();
  }
  onComplete();
}

/* ------------------------------------------------------------------ */
/* Reduced motion — static first frame only, no animation              */
/* ------------------------------------------------------------------ */

const prefersReducedMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

async function initReducedMotion(): Promise<void> {
  document.documentElement.classList.add("reduced-motion");
  sizeCanvas();
  const loaded = await loadFrame(0);
  if (loaded) {
    frameState.frame = 0;
    renderFrame(true);
  }
}

/* ------------------------------------------------------------------ */
/* Main — Lenis + GSAP ScrollTrigger on one unified ticker             */
/* ------------------------------------------------------------------ */

function initCinematicScroll(): void {
  gsap.registerPlugin(ScrollTrigger);
  sizeCanvas();

  /* Smooth scrolling, fully synchronized with ScrollTrigger. */
  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);

  /* ONE animation loop: Lenis is driven by the GSAP ticker. */
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  /* Scroll position → progress → frame number → canvas image. */
  gsap.to(frameState, {
    frame: FRAME_COUNT - 1,
    ease: "none", // scroll position itself controls the motion
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
    onUpdate: () => renderFrame(),
  });

  /* Paint the very first frame as soon as it is available, then
     progressively load the rest without blocking the page. */
  void preloadFrames(
    () => renderFrame(true),
    () => ScrollTrigger.refresh()
  );

  /* Responsive resize: re-measure and repaint the current frame. */
  window.addEventListener("resize", () => {
    sizeCanvas();
    renderFrame(true);
  });
}

if (prefersReducedMotion) {
  void initReducedMotion();
} else {
  initCinematicScroll();
}

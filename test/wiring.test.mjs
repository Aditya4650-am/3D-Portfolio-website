/* Behavioral test: bundles src/main.ts with stubbed gsap/lenis, runs it in
   jsdom against the real index.html, and verifies the interactive wiring —
   first-frame painting, DPR canvas sizing, anchor scrolling, project
   filters, the contact form mailto, resize handling, and the
   reduced-motion fallback. */

import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function bundle() {
  await build({
    entryPoints: ["src/main.ts"],
    outfile: "test/.build/main.bundle.mjs",
    format: "esm",
    bundle: true,
    logLevel: "silent",
    loader: { ".css": "empty" },
    plugins: [
      {
        name: "stub-gsap-lenis",
        setup(pluginBuild) {
          pluginBuild.onResolve({ filter: /^(gsap|gsap\/ScrollTrigger|lenis)$/ }, (args) => {
            const map = {
              gsap: "test/stubs/gsap.mjs",
              "gsap/ScrollTrigger": "test/stubs/gsap-ScrollTrigger.mjs",
              lenis: "test/stubs/lenis.mjs",
            };
            return { path: resolve(map[args.path]) };
          });
        },
      },
    ],
  });
}

function makeEnv({ reducedMotion }) {
  const html = readFileSync("index.html", "utf8").replace(
    /<script\s+type="module"[^>]*>\s*<\/script>/,
    ""
  );

  const navigationUrls = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => {
    navigationUrls.push(
      `${error.message} ${JSON.stringify(error.detail ?? {})}}`
    );
  });
  virtualConsole.on("error", () => {});

  const dom = new JSDOM(html, {
    url: "https://portfolio.test/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });

  const { window } = dom;

  window.matchMedia = (query) => ({
    matches: reducedMotion && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  window.devicePixelRatio = 2;

  const ctx = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "",
    fillStyle: "",
    fillRectCount: 0,
    drawImageCount: 0,
    fillRect() {
      this.fillRectCount++;
    },
    drawImage() {
      this.drawImageCount++;
    },
  };
  window.HTMLCanvasElement.prototype.getContext = () => ctx;

  class FakeImage {
    constructor() {
      this.naturalWidth = 1440;
      this.naturalHeight = 810;
      this.complete = false;
      this.decoding = "";
    }

    set src(value) {
      this._src = value;
      this.complete = true;
      queueMicrotask(() => this.onload?.());
    }

    get src() {
      return this._src;
    }

    decode() {
      return Promise.resolve();
    }
  }

  window.Image = FakeImage;
  window.Element.prototype.scrollIntoView = function scrollIntoView() {};

  return { dom, window, ctx, navigationUrls, FakeImage };
}

function mountGlobals(env) {
  globalThis.window = env.window;
  globalThis.document = env.window.document;
  globalThis.history = env.window.history;
  globalThis.Image = env.window.Image;
  globalThis.HTMLCanvasElement = env.window.HTMLCanvasElement;
  globalThis.Element = env.window.Element;
}

async function runScenario(name, { reducedMotion }) {
  const env = makeEnv({ reducedMotion });
  mountGlobals(env);
  globalThis.__wt = { gsap: { to: 0, set: 0, ticker: 0 }, st: { refresh: 0, batch: 0 }, lenis: [] };

  const bundleUrl =
    pathToFileURL("test/.build/main.bundle.mjs").href +
    `?scenario=${encodeURIComponent(name)}`;
  const bundle = await import(bundleUrl);

  const settle = () => new Promise((resolve) => setTimeout(resolve, 250));
  await settle();

  const { window, ctx, navigationUrls } = env;
  const document = window.document;
  const wt = globalThis.__wt;

  /* Canvas sized for DPR 2 and the very first frame painted. */
  assert(
    document.getElementById("canvas").width === window.innerWidth * 2,
    `[${name}] canvas not sized for devicePixelRatio 2`
  );
  assert(
    ctx.drawImageCount >= 1,
    `[${name}] first frame was never painted to the canvas`
  );

  /* Anchor links scroll through Lenis (or natively under reduced motion). */
  const before = wt.lenis.length;
  document.querySelector('.site-nav a[href="#projects"]').click();
  if (reducedMotion) {
    assert(
      wt.lenis.length === before,
      `[${name}] Lenis should not exist under reduced motion`
    );
  } else {
    assert(
      wt.lenis.length === before + 1,
      `[${name}] anchor click did not route through Lenis`
    );
    assert(
      wt.lenis.at(-1)?.target?.id === "projects",
      `[${name}] Lenis did not receive the #projects element`
    );
  }

  /* Project filters toggle the correct cards. */
  const webButton = document.querySelector('[data-filter="web"]');
  webButton.click();
  const cards = [...document.querySelectorAll("[data-cat]")];
  const visible = cards.filter((c) => !c.classList.contains("is-hidden"));
  assert(
    visible.length === 2 && visible.every((c) => c.dataset.cat.split(/\s+/).includes("web")),
    `[${name}] "Web" filter did not leave exactly the two web projects visible`
  );
  assert(
    webButton.classList.contains("is-active"),
    `[${name}] active filter state missing`
  );
  document.querySelector('[data-filter="all"]').click();
  assert(
    [...document.querySelectorAll("[data-cat]")].every(
      (c) => !c.classList.contains("is-hidden")
    ),
    `[${name}] "All" filter did not restore every project`
  );
  if (!reducedMotion) {
    assert(wt.st.refresh > 0, `[${name}] filtering did not refresh ScrollTrigger`);
  }

  /* Contact form navigates to a correctly composed mailto URL. */
  const form = document.getElementById("contact-form");
  form.querySelector('[name="name"]').value = "Test Client";
  form.querySelector('[name="email"]').value = "client@example.com";
  form.querySelector('[name="type"]').value = "Web Application";
  form.querySelector('[name="message"]').value = "Hello from the test.";
  const navigationBefore = navigationUrls.length;
  form.dispatchEvent(
    new window.Event("submit", { bubbles: true, cancelable: true })
  );
  await settle();
  assert(
    navigationUrls.length > navigationBefore,
    `[${name}] form submit did not navigate`
  );

  /* The composed mailto URL carries address, type, and message. */
  const mailtoUrl = bundle.buildMailtoUrl(
    new window.FormData(form)
  );
  assert(
    mailtoUrl.startsWith("mailto:adityamands@gmail.com?"),
    `[${name}] mailto missing the contact address: ${mailtoUrl}`
  );
  const decoded = decodeURIComponent(mailtoUrl);
  assert(decoded.includes("Web Application"), `[${name}] mailto missing the project type`);
  assert(decoded.includes("Hello from the test."), `[${name}] mailto missing the message body`);
  assert(decoded.includes("client@example.com"), `[${name}] mailto missing the sender email`);

  /* Resize re-measures the canvas at the current DPR. */
  Object.defineProperty(window, "innerWidth", {
    value: 800,
    configurable: true,
  });
  window.dispatchEvent(new window.Event("resize"));
  assert(
    document.getElementById("canvas").width === 1600,
    `[${name}] resize did not re-measure the canvas`
  );

  /* Reduced motion: static mode, no smooth-scroll machinery. */
  if (reducedMotion) {
    assert(
      document.documentElement.classList.contains("reduced-motion"),
      `[${name}] reduced-motion class missing`
    );
  } else {
    assert(
      !document.documentElement.classList.contains("reduced-motion"),
      `[${name}] reduced-motion class should not be set`
    );
    assert(wt.gsap.to >= 1, `[${name}] frame scrub tween was not created`);
    assert(wt.gsap.ticker === 1, `[${name}] Lenis not on a single GSAP ticker`);
  }

  env.dom.window.close();
}

await bundle();
await runScenario("cinematic", { reducedMotion: false });
await runScenario("reduced-motion", { reducedMotion: true });

if (failures.length) {
  console.error("wiring test FAILED:\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log("wiring test OK — cinematic + reduced-motion scenarios passed");

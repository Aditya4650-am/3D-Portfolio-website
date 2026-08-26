/* Generates the self-hosted brand logos in public/logos/ from the
   simple-icons package. Black brand marks (Next.js, Vercel, GitHub) are
   rendered white so they stay visible on the dark glass boxes.

   Run after adding/changing tools:
       node scripts/gen-logos.mjs
*/

import { mkdirSync, writeFileSync } from "node:fs";
import {
  siReact,
  siNextdotjs,
  siTailwindcss,
  siHtml5,
  siNodedotjs,
  siPostgresql,
  siVercel,
  siFirebase,
  siArduino,
  siGithub,
  siJavascript,
  siCss,
} from "simple-icons";

const WHITE_ON_DARK = new Set(["nextdotjs", "vercel", "github"]);

const TOOLS = [
  { slug: "react", file: "react", icon: siReact },
  { slug: "nextdotjs", file: "nextjs", icon: siNextdotjs },
  { slug: "tailwindcss", file: "tailwindcss", icon: siTailwindcss },
  { slug: "html5", file: "html5", icon: siHtml5 },
  { slug: "nodedotjs", file: "nodedotjs", icon: siNodedotjs },
  { slug: "postgresql", file: "postgresql", icon: siPostgresql },
  { slug: "vercel", file: "vercel", icon: siVercel },
  { slug: "firebase", file: "firebase", icon: siFirebase },
  { slug: "arduino", file: "arduino", icon: siArduino },
  { slug: "github", file: "github", icon: siGithub },
  { slug: "javascript", file: "javascript", icon: siJavascript },
  { slug: "css", file: "css3", icon: siCss },
];

mkdirSync("public/logos", { recursive: true });

for (const tool of TOOLS) {
  const fill = WHITE_ON_DARK.has(tool.slug)
    ? "#FFFFFF"
    : `#${tool.icon.hex}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${fill}">` +
    `<title>${tool.icon.title}</title>` +
    `<path d="${tool.icon.path}"/></svg>\n`;
  writeFileSync(`public/logos/${tool.file}.svg`, svg);
  console.log(`public/logos/${tool.file}.svg — ${tool.icon.title} ${fill}`);
}

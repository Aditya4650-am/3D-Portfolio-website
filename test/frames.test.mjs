/* Verifies the enhanced frame assets: count, naming, dimensions, payload. */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIR = "public/frames";
const COUNT = 240;
const EXPECTED = { width: 1440, height: 810 };

function webpSize(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const format = buffer.toString("ascii", 12, 16);
  if (format === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (format === "VP8L") {
    const b = buffer.subarray(21, 25);
    return {
      width: 1 + (b[0] | ((b[1] & 0x3f) << 8)),
      height:
        1 +
        (((b[1] >> 6) | (b[2] << 2)) | ((b[3] & 0x0f) << 10)),
    };
  }
  if (format === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  return null;
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".webp")).sort();

const failures = [];
if (files.length !== COUNT) {
  failures.push(`expected ${COUNT} frames, found ${files.length}`);
}

let totalBytes = 0;
for (let i = 0; i < files.length; i++) {
  const expectedName = `frame_${String(i + 1).padStart(6, "0")}.webp`;
  if (files[i] !== expectedName) {
    failures.push(`naming mismatch: ${files[i]} !== ${expectedName}`);
    break;
  }
  const path = join(DIR, files[i]);
  const size = webpSize(readFileSync(path));
  if (!size || size.width !== EXPECTED.width || size.height !== EXPECTED.height) {
    failures.push(
      `${files[i]}: expected ${EXPECTED.width}x${EXPECTED.height}, got ${
        size ? `${size.width}x${size.height}` : "unreadable"
      }`
    );
    break;
  }
  totalBytes += statSync(path).size;
}

const totalMB = totalBytes / 1024 / 1024;
if (totalMB > 25) failures.push(`payload too large: ${totalMB.toFixed(1)} MB`);

if (failures.length) {
  console.error("frames test FAILED:\n  " + failures.join("\n  "));
  process.exit(1);
}

console.log(
  `frames test OK — ${files.length} frames, ${EXPECTED.width}x${EXPECTED.height}, ${totalMB.toFixed(1)} MB total`
);

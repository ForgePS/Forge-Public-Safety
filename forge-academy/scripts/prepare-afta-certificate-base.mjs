/**
 * Extracts decorative assets from the AFTA IFSAC certificate reference PNG.
 * Run: npm run certificates:prepare-base
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const input = join(root, "public/certificates/afta-ifsac-reference.png");
const assetsDir = join(root, "public/certificates/afta-ifsac");

if (!existsSync(input)) {
  console.error("Missing reference image:", input);
  process.exit(1);
}

mkdirSync(assetsDir, { recursive: true });

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("Install sharp first: npm install --save-dev sharp");
  process.exit(1);
}

const { width, height } = await sharp(input).metadata();
if (!width || !height) {
  console.error("Unable to read image dimensions.");
  process.exit(1);
}

/** @param {number} xPct @param {number} yPct @param {number} wPct @param {number} hPct @param {string} name */
async function extract(xPct, yPct, wPct, hPct, name) {
  const left = Math.max(0, Math.round((xPct / 100) * width));
  const top = Math.max(0, Math.round((yPct / 100) * height));
  const extractWidth = Math.min(width - left, Math.round((wPct / 100) * width));
  const extractHeight = Math.min(height - top, Math.round((hPct / 100) * height));
  const output = join(assetsDir, name);
  await sharp(input)
    .extract({ left, top, width: extractWidth, height: extractHeight })
    .png()
    .toFile(output);
  console.log("Extracted", name);
}

await extract(0, 0, 10, 12, "corner-tl.png");
await extract(90, 88, 10, 12, "corner-br.png");
await extract(74, 0, 26, 22, "wave-tr.png");
await extract(0, 88, 24, 12, "wave-bl.png");
await extract(8.2, 80.5, 9, 6.2, "seal-ifsac.png");
await extract(77.5, 73.5, 20, 22, "seal-arkansas.png");
await extract(24, 24, 52, 52, "watermark.png");

console.log(`Done. Assets in ${assetsDir} (${width}x${height})`);

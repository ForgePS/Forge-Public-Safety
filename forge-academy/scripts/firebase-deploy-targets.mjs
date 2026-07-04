import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexSource = readFileSync(join(root, "functions/index.js"), "utf8");
const functionNames = [...indexSource.matchAll(/^export const (\w+)/gm)].map((match) => match[1]);

if (!functionNames.length) {
  console.error("No Cloud Functions exports found in functions/index.js");
  process.exit(1);
}

const mode = process.argv[2] ?? "all";
const functionTargets = functionNames.map((name) => `functions:${name}`);

if (mode === "hosting") {
  process.stdout.write("hosting,firestore:rules");
} else if (mode === "functions") {
  process.stdout.write(functionTargets.join(","));
} else {
  process.stdout.write(["hosting", "firestore:rules", ...functionTargets].join(","));
}

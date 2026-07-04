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

const targets = ["hosting", "firestore:rules", ...functionNames.map((name) => `functions:${name}`)];
process.stdout.write(targets.join(","));

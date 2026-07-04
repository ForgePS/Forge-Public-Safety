import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shell = process.platform === "win32";

function run(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell,
  });

  if (result.status !== 0) {
    console.error(`\n${label} failed (exit ${result.status ?? 1}).`);
    process.exit(result.status ?? 1);
  }
}

run("npm", ["run", "build"], "Build");

const targets = spawnSync("node", ["scripts/firebase-deploy-targets.mjs", "hosting"], {
  cwd: root,
  encoding: "utf8",
  shell,
});

if (targets.status !== 0) {
  console.error(targets.stderr || "Unable to resolve hosting deploy targets.");
  process.exit(1);
}

const deployOnly = targets.stdout.trim();
console.log(`Deploying: ${deployOnly}`);

run(
  "npx",
  [
    "firebase-tools",
    "deploy",
    "--only",
    deployOnly,
    "--project",
    "forge-academy-95f84",
    "--non-interactive",
  ],
  "Firebase deploy",
);

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

process.env.FUNCTIONS_DISCOVERY_TIMEOUT ||= "120";

const targets = spawnSync("node", ["scripts/firebase-deploy-targets.mjs", "functions"], {
  cwd: root,
  encoding: "utf8",
});

if (targets.status !== 0) {
  console.error(targets.stderr || "Unable to resolve function deploy targets.");
  process.exit(1);
}

const deployOnly = targets.stdout.trim();
console.log(`Deploying ${deployOnly.split(",").length} Cloud Functions (discovery timeout ${process.env.FUNCTIONS_DISCOVERY_TIMEOUT}s)`);

const result = spawnSync(
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
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  },
);

process.exit(result.status ?? 1);

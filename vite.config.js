import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

function cmsSeedPlugin() {
  async function writeSeedFile() {
    const { buildSeedData } = await import("./src/cms/store/seed.js");
    const outPath = join(process.cwd(), "public/cms-seed.json");
    mkdirSync(join(process.cwd(), "public"), { recursive: true });
    writeFileSync(outPath, JSON.stringify(buildSeedData()));
  }

  return {
    name: "generate-cms-seed",
    async buildStart() {
      await writeSeedFile();
    },
    async configureServer() {
      await writeSeedFile();
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cmsSeedPlugin()],
});

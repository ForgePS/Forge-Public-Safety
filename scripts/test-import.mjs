import fs from "fs";
import { mergeUploadedContentFiles, analyzeMergedUpload } from "./src/cms/store/contentBuilders.js";
import { buildContentFromJson, importProgramContent } from "./src/cms/store/programImport.js";

const mem = {};
globalThis.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};
globalThis.window = globalThis;
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
globalThis.dispatchEvent = () => true;

const names = [
  "global.json", "home.json", "products-page.json", "product-modules.json",
  "addon-modules.json", "solutions.json", "company.json", "contact.json",
  "resources.json", "footer.json", "media.json",
];
const all = names.map((name) => ({ name, data: JSON.parse(fs.readFileSync(`./content/${name}`, "utf8")) }));

const merged = mergeUploadedContentFiles(all);
console.log("analysis", analyzeMergedUpload(merged));
const bundle = buildContentFromJson("forge-marketing", merged);
console.log("pages", bundle.pages.map((p) => p.slug).join(","));
console.log("hero", bundle.pages[0].sections[0].blocks[0].content.backgroundImage);

const result = await importProgramContent("forge-marketing", { source: "json", json: merged, replace: true });
console.log("import ok", result.pagesImported, result.importMode);

const minimal = mergeUploadedContentFiles(all.filter((f) => ["global.json", "home.json"].includes(f.name)));
const b2 = buildContentFromJson("forge-marketing", minimal);
console.log("minimal pages", b2.pages.length);

try {
  buildContentFromJson("forge-marketing", mergeUploadedContentFiles(all.filter((f) => f.name === "home.json")));
} catch (e) {
  console.log("missing global expected:", e.message);
}

console.log("PASS");

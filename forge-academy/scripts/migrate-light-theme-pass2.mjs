import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const skipFiles = new Set(["components/DashboardLayout.jsx"]);

const replacements = [
  ["text-white", "text-[var(--color-afta-text)]"],
  ["text-[#e2e8f0]", "text-[var(--color-afta-text)]"],
  ["border-[#334155]", "border-[var(--color-afta-border)]"],
  ["hover:border-[#334155]", "hover:border-[var(--color-afta-border)]"],
  ["bg-[#0c4a6e]/30", "bg-sky-50"],
  ["border-[#38bdf8]/40", "border-sky-300"],
  ["text-[#7dd3fc]", "text-sky-700"],
  ["shadow-[inset_0_0_0_1px_rgba(56,189,248,0.15)]", "shadow-sm"],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".jsx") || entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

function restoreWhiteOnPrimary(content) {
  const patterns = [
    /(bg-\[var\(--color-afta-red\)\][^"']*?)text-\[var\(--color-afta-text\)\]/g,
    /(bg-\[#c8102e\][^"']*?)text-\[var\(--color-afta-text\)\]/g,
    /(bg-\[var\(--color-afta-red\)\]\/\d+[^"']*?)text-\[var\(--color-afta-text\)\]/g,
    /(bg-\[#c8102e\]\/\d+[^"']*?)text-\[var\(--color-afta-text\)\]/g,
    /(isActive[\s\S]{0,120}bg-\[var\(--color-afta-red\)\][^"']*?)text-\[var\(--color-afta-text\)\]/g,
  ];
  let next = content;
  for (const pattern of patterns) {
    next = next.replace(pattern, "$1text-white");
  }
  return next;
}

function migrateFile(filePath) {
  const rel = path.relative(root, filePath).replaceAll("\\", "/");
  if (skipFiles.has(rel)) return false;

  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  content = restoreWhiteOnPrimary(content);

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

const changed = walk(root).filter(migrateFile);
console.log(`Pass 2 updated ${changed.length} files.`);

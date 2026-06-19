import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const skipFiles = new Set(["components/DashboardLayout.jsx"]);

const replacements = [
  ["border-[#1e293b]", "border-[var(--color-afta-border)]"],
  ["hover:border-[#1e293b]", "hover:border-[var(--color-afta-border)]"],
  ["bg-[#111827]", "bg-[var(--color-afta-surface)]"],
  ["bg-[#0b1220]", "bg-white"],
  ["bg-[#020617]", "bg-[var(--color-afta-bg)]"],
  ["text-[#94a3b8]", "text-[var(--color-afta-subtle)]"],
  ["text-[#64748b]", "text-[var(--color-afta-muted)]"],
  ["text-[#cbd5e1]", "text-[var(--color-afta-text)]"],
  ["text-[#fecaca]", "text-red-700"],
  ["bg-[#1e293b]", "bg-slate-100"],
  ["hover:bg-[#1e293b]", "hover:bg-slate-100"],
  ["focus:border-[#c8102e]/50", "focus:border-[var(--color-afta-red)]/50"],
  ["hover:text-white", "hover:text-[var(--color-afta-text)]"],
  [
    "rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]",
    "app-btn-secondary px-4 py-2 text-xs",
  ],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".jsx") || entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

function migrateFile(filePath) {
  const rel = path.relative(root, filePath).replaceAll("\\", "/");
  if (skipFiles.has(rel)) return false;

  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  // Primary buttons must keep white label text.
  content = content.replace(
    /(bg-\[var\(--color-afta-red\)\][^"']*?)text-\[var\(--color-afta-text\)\]/g,
    "$1text-white",
  );
  content = content.replace(
    /(bg-\[#c8102e\][^"']*?)text-\[var\(--color-afta-text\)\]/g,
    "$1text-white",
  );
  content = content.replace(
    /(bg-\[var\(--color-afta-red\)\]\/\d+[^"']*?)text-\[var\(--color-afta-text\)\]/g,
    "$1text-white",
  );

  // Add subtle shadow to common panel shells when missing.
  content = content.replace(
    /rounded-\[14px\] border border-\[var\(--color-afta-border\)\] bg-\[var\(--color-afta-surface\)\](?! shadow)/g,
    "rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm",
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

const changed = walk(root).filter(migrateFile);
console.log(`Updated ${changed.length} files.`);

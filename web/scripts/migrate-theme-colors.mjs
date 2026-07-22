#!/usr/bin/env node
/**
 * Bulk migrate hardcoded light-only Tailwind colors to semantic tokens.
 * Run from web/: node scripts/migrate-theme-colors.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const SRC = join(process.cwd(), "src");

const REPLACEMENTS = [
  // Hover states first (longer patterns)
  ["hover:bg-gray-50", "hover:bg-muted"],
  ["hover:bg-gray-100", "hover:bg-muted"],
  ["hover:bg-slate-50", "hover:bg-muted"],
  ["hover:bg-slate-100", "hover:bg-muted"],
  ["hover:bg-white/80", "hover:bg-muted/80"],
  ["hover:bg-white/60", "hover:bg-muted/60"],
  ["hover:bg-white", "hover:bg-muted"],
  // Backgrounds with opacity
  ["bg-white/95", "bg-card/95"],
  ["bg-white/90", "bg-card/90"],
  ["bg-white/80", "bg-card/80"],
  ["bg-white/70", "bg-card/70"],
  ["bg-white/60", "bg-card/60"],
  ["bg-white/50", "bg-card/50"],
  ["bg-white/40", "bg-card/40"],
  ["bg-white/30", "bg-card/30"],
  ["bg-white/20", "bg-card/20"],
  ["bg-white/10", "bg-card/10"],
  // Solid backgrounds
  ["bg-gray-50", "bg-muted"],
  ["bg-slate-50", "bg-muted"],
  ["bg-gray-100", "bg-muted"],
  ["bg-slate-100", "bg-muted"],
  ["bg-gray-200", "bg-muted"],
  ["bg-slate-200", "bg-muted"],
  // Text colors
  ["text-gray-900", "text-foreground"],
  ["text-slate-900", "text-foreground"],
  ["text-gray-800", "text-foreground"],
  ["text-slate-800", "text-foreground"],
  ["text-gray-700", "text-foreground"],
  ["text-slate-700", "text-foreground"],
  ["text-gray-600", "text-muted-foreground"],
  ["text-slate-600", "text-muted-foreground"],
  ["text-gray-500", "text-muted-foreground"],
  ["text-slate-500", "text-muted-foreground"],
  ["text-gray-400", "text-muted-foreground"],
  // Borders
  ["border-gray-300", "border-border"],
  ["border-slate-300", "border-border"],
  ["border-gray-200", "border-border"],
  ["border-slate-200", "border-border"],
  ["border-gray-100", "border-border"],
  ["border-slate-100", "border-border"],
  // Dividers
  ["divide-gray-200", "divide-border"],
  ["divide-slate-200", "divide-border"],
  ["divide-gray-100", "divide-border"],
  // Ring
  ["ring-gray-200", "ring-border"],
  ["ring-slate-200", "ring-border"],
  // Plain bg-white last (after opacity variants)
  ["bg-white", "bg-card"],
];

const SKIP_DIRS = new Set(["node_modules", "__tests__", ".git"]);
const SKIP_FILES = new Set([
  "LoginPage.tsx", // manually migrated
  "Sidebar.tsx",
  "Header.tsx",
  "AppLayout.tsx",
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if ([".tsx", ".ts"].includes(extname(entry)) && !entry.endsWith(".test.tsx")) {
      files.push(full);
    }
  }
  return files;
}

let totalFiles = 0;
let totalChanges = 0;

for (const file of walk(SRC)) {
  const basename = file.split("/").pop();
  if (SKIP_FILES.has(basename)) continue;

  let content = readFileSync(file, "utf8");
  const original = content;

  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }

  if (content !== original) {
    writeFileSync(file, content, "utf8");
    totalFiles++;
    totalChanges++;
  }
}

console.log(`Migrated ${totalFiles} files.`);

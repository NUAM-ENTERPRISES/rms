#!/usr/bin/env node
/** Fix remaining light-only page patterns for dark mode */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const SRC = join(process.cwd(), "src");
const SKIP = new Set(["node_modules", "__tests__", "tile-accent-styles.ts"]);

const REPLACEMENTS = [
  ["min-h-screen bg-gradient-to-br from-slate-50 to-slate-100", "min-h-screen bg-gradient-to-br from-background to-muted"],
  ["bg-gradient-to-br from-slate-50 to-slate-100", "bg-gradient-to-br from-background to-muted"],
  ["bg-gradient-to-r from-gray-50 to-white", "bg-gradient-to-r from-muted to-card"],
  ["bg-gradient-to-r from-slate-50 to-white", "bg-gradient-to-r from-muted to-card"],
  ["from-gray-50 to-white", "from-muted to-card"],
  ["from-slate-50 to-white", "from-muted to-card"],
  ["from-white to-gray-50", "from-card to-muted"],
  ["from-white to-slate-50", "from-card to-muted"],
  ["via-white to", "via-card to"],
  ["via-white ", "via-card "],
  [" to-white", " to-card"],
  ["from-white ", "from-card "],
  ["bg-[#0f172a]", "bg-popover"],
  ["border-violet-500/30 text-white", "border-border text-popover-foreground"],
  ["border-violet-500/20", "border-border"],
  ["border-violet-500/10", "border-border/60"],
  ["hover:bg-violet-500/10", "hover:bg-accent"],
  ["text-violet-300", "text-primary"],
  ["border-violet-500/50 text-violet-300", "border-border text-muted-foreground"],
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if ([".tsx", ".ts"].includes(extname(entry)) && !entry.endsWith(".test.tsx"))
      files.push(full);
  }
  return files;
}

let count = 0;
for (const file of walk(SRC)) {
  let content = readFileSync(file, "utf8");
  const original = content;
  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    writeFileSync(file, content, "utf8");
    count++;
  }
}
console.log(`Fixed ${count} files.`);

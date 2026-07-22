#!/usr/bin/env node
/** Add dark: variants to status badge class strings */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const COLORS = [
  "blue", "yellow", "orange", "purple", "green", "red", "gray", "indigo",
  "cyan", "amber", "emerald", "violet", "rose", "pink", "teal",
];

const FILES = [
  "src/constants/statuses.ts",
  "src/features/candidates/utils/candidateStatusVisualConfig.ts",
  "src/features/candidates/constants/candidatePipelineStatusConfig.ts",
  "src/features/projects/constants/statusBadges.ts",
];

function addDarkVariants(content) {
  for (const color of COLORS) {
    const lightBg = `bg-${color}-50`;
    const lightText700 = `text-${color}-700`;
    const lightText800 = `text-${color}-800`;
    const lightBorder = `border-${color}-200`;

    // badgeClass patterns: bg-X-50 text-X-700 border-X-200
    const badgePattern700 = new RegExp(
      `(badgeClass:\\s*"[^"]*?)${lightBg}([^"]*?)${lightText700}([^"]*?)${lightBorder}([^"]*")`,
      "g"
    );
    content = content.replace(
      badgePattern700,
      `$1${lightBg} dark:bg-${color}-950/30$2${lightText700} dark:text-${color}-300$3${lightBorder} dark:border-${color}-800$4`
    );

    const badgePattern800 = new RegExp(
      `(badgeClass:\\s*"[^"]*?)${lightBg}([^"]*?)${lightText800}([^"]*?)${lightBorder}([^"]*")`,
      "g"
    );
    content = content.replace(
      badgePattern800,
      `$1${lightBg} dark:bg-${color}-950/30$2${lightText800} dark:text-${color}-300$3${lightBorder} dark:border-${color}-800$4`
    );

    // bgColor patterns in visual config
    const bgColorPattern = new RegExp(
      `(bgColor:\\s*"${lightBg}")(?!\\s*dark:)`,
      "g"
    );
    content = content.replace(
      bgColorPattern,
      `$1 dark:bg-${color}-950/30`
    );
  }
  return content;
}

const root = process.cwd();
for (const file of FILES) {
  const path = join(root, file);
  try {
    const original = readFileSync(path, "utf8");
    const updated = addDarkVariants(original);
    if (updated !== original) {
      writeFileSync(path, updated, "utf8");
      console.log(`Updated ${file}`);
    }
  } catch (e) {
    console.warn(`Skip ${file}: ${e.message}`);
  }
}

console.log("Done.");

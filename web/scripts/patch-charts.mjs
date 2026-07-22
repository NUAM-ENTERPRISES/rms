#!/usr/bin/env node
/** Patch remaining chart files to use useChartTheme */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const FILES = [
  "src/features/analytics/components/RecruiterPerformanceStagesChart.tsx",
  "src/features/analytics/components/RecruiterFollowupStatusChart.tsx",
  "src/features/analytics/components/RecruiterActivityChart.tsx",
  "src/features/analytics/components/RecruiterActivityBreakdownChart.tsx",
  "src/features/candidates/components/RecruiterPerformanceChartWrapper.tsx",
  "src/features/project-coordinator-dashboard/components/ClientsOverviewChart.tsx",
];

const root = process.cwd();

for (const file of FILES) {
  const path = join(root, file);
  let content = readFileSync(path, "utf8");
  if (content.includes("useChartTheme")) continue;

  if (!content.includes('from "@/lib/chart-theme"')) {
    content = content.replace(
      /(from "recharts";)/,
      '$1\nimport { useChartTheme } from "@/lib/chart-theme";'
    );
  }

  content = content.replace(
    /export default function (\w+)\(\) \{/,
    'export default function $1() {\n  const chart = useChartTheme();'
  );

  content = content
    .replace(/stroke="#e2e8f0"/g, "stroke={chart.grid}")
    .replace(/stroke="#f3f4f6"/g, "stroke={chart.grid}")
    .replace(/stroke="#e5e7eb"/g, "stroke={chart.grid}")
    .replace(/stroke="#f1f5f9"/g, "stroke={chart.grid}")
    .replace(/fill: "#64748b"/g, "fill: chart.axis")
    .replace(/fill: "#6b7280"/g, "fill: chart.axis")
    .replace(/fill: "#9ca3af"/g, "fill: chart.axis")
    .replace(/fill: "#94a3b8"/g, "fill: chart.axis")
    .replace(/fill: "#475569"/g, "fill: chart.axis")
    .replace(/fill="#6366f1"/g, "fill={chart.primary}")
    .replace(/fill="#10b981"/g, "fill={chart.success}");

  writeFileSync(path, content, "utf8");
  console.log(`Patched ${file}`);
}

console.log("Done.");

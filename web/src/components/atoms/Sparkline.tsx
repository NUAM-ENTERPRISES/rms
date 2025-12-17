import React from "react";

export default function Sparkline({
  data,
  width = 120,
  height = 28,
  stroke = "#2563eb",
}: {
  data: { date: string; count: number }[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  if (!data || data.length === 0) return null;

  const counts = data.map((d) => d.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const range = max - min || 1;

  const step = width / Math.max(1, data.length - 1);

  const points = data
    .map((d, i) => {
      const x = i * step;
      const y = height - ((d.count - min) / range) * (height - 4) - 2; // padding
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="opacity-90"
      />
    </svg>
  );
}

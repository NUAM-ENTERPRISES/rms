/** Dashboard stat tile accents — pastel in light mode, muted dark surfaces in dark mode. */
export type TileAccentStyle = {
  card: string;
  icon: string;
  iconBg: string;
  value: string;
  label: string;
  subtitle: string;
  footer: string;
  ring: string;
  dot: string;
};

const sharedText = {
  label: "text-slate-500 dark:text-slate-400",
  subtitle: "text-slate-500 dark:text-slate-400",
  footer:
    "text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400",
};

export const tileAccentStyles: Record<string, TileAccentStyle> = {
  blue: {
    card:
      "from-blue-50 via-white to-blue-50/30 border-blue-100 dark:from-blue-950/70 dark:via-slate-900 dark:to-blue-950/40 dark:border-blue-800/60",
    icon: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    value: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-400/50",
    dot: "bg-blue-500",
    ...sharedText,
  },
  emerald: {
    card:
      "from-emerald-50 via-white to-emerald-50/30 border-emerald-100 dark:from-emerald-950/70 dark:via-slate-900 dark:to-emerald-950/40 dark:border-emerald-800/60",
    icon: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    value: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-400/50",
    dot: "bg-emerald-500",
    ...sharedText,
  },
  orange: {
    card:
      "from-orange-50 via-white to-orange-50/30 border-orange-100 dark:from-orange-950/70 dark:via-slate-900 dark:to-orange-950/40 dark:border-orange-800/60",
    icon: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
    value: "text-orange-700 dark:text-orange-300",
    ring: "ring-orange-400/50",
    dot: "bg-orange-500",
    ...sharedText,
  },
  purple: {
    card:
      "from-purple-50 via-white to-purple-50/30 border-purple-100 dark:from-purple-950/70 dark:via-slate-900 dark:to-purple-950/40 dark:border-purple-800/60",
    icon: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    value: "text-purple-700 dark:text-purple-300",
    ring: "ring-purple-400/50",
    dot: "bg-purple-500",
    ...sharedText,
  },
  lime: {
    card:
      "from-lime-50 via-white to-lime-50/30 border-lime-100 dark:from-lime-950/70 dark:via-slate-900 dark:to-lime-950/40 dark:border-lime-800/60",
    icon: "text-lime-700 dark:text-lime-400",
    iconBg: "bg-lime-100 dark:bg-lime-900/50",
    value: "text-lime-700 dark:text-lime-300",
    ring: "ring-lime-400/50",
    dot: "bg-lime-500",
    ...sharedText,
  },
  indigo: {
    card:
      "from-indigo-50 via-white to-indigo-50/30 border-indigo-100 dark:from-indigo-950/70 dark:via-slate-900 dark:to-indigo-950/40 dark:border-indigo-800/60",
    icon: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    value: "text-indigo-700 dark:text-indigo-300",
    ring: "ring-indigo-400/50",
    dot: "bg-indigo-500",
    ...sharedText,
  },
  teal: {
    card:
      "from-teal-50 via-white to-teal-50/30 border-teal-100 dark:from-teal-950/70 dark:via-slate-900 dark:to-teal-950/40 dark:border-teal-800/60",
    icon: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-100 dark:bg-teal-900/50",
    value: "text-teal-700 dark:text-teal-300",
    ring: "ring-teal-400/50",
    dot: "bg-teal-500",
    ...sharedText,
  },
  slate: {
    card:
      "from-slate-50 via-white to-slate-50/30 border-slate-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 dark:border-slate-700/60",
    icon: "text-slate-600 dark:text-slate-400",
    iconBg: "bg-slate-100 dark:bg-slate-800/60",
    value: "text-slate-700 dark:text-slate-300",
    ring: "ring-slate-400/50",
    dot: "bg-slate-500",
    ...sharedText,
  },
  amber: {
    card:
      "from-amber-50 via-white to-amber-50/30 border-amber-100 dark:from-amber-950/70 dark:via-slate-900 dark:to-amber-950/40 dark:border-amber-800/60",
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    value: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-400/50",
    dot: "bg-amber-500",
    ...sharedText,
  },
  rose: {
    card:
      "from-rose-50 via-white to-rose-50/30 border-rose-100 dark:from-rose-950/70 dark:via-slate-900 dark:to-rose-950/40 dark:border-rose-800/60",
    icon: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-900/50",
    value: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-400/50",
    dot: "bg-rose-500",
    ...sharedText,
  },
  red: {
    card:
      "from-red-50 via-white to-red-50/30 border-red-100 dark:from-red-950/70 dark:via-slate-900 dark:to-red-950/40 dark:border-red-800/60",
    icon: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    value: "text-red-700 dark:text-red-300",
    ring: "ring-red-400/50",
    dot: "bg-red-500",
    ...sharedText,
  },
  cyan: {
    card:
      "from-cyan-50 via-white to-cyan-50/30 border-cyan-100 dark:from-cyan-950/70 dark:via-slate-900 dark:to-cyan-950/40 dark:border-cyan-800/60",
    icon: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/50",
    value: "text-cyan-700 dark:text-cyan-300",
    ring: "ring-cyan-400/50",
    dot: "bg-cyan-500",
    ...sharedText,
  },
  fuchsia: {
    card:
      "from-fuchsia-50 via-white to-fuchsia-50/30 border-fuchsia-100 dark:from-fuchsia-950/70 dark:via-slate-900 dark:to-fuchsia-950/40 dark:border-fuchsia-800/60",
    icon: "text-fuchsia-600 dark:text-fuchsia-400",
    iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900/50",
    value: "text-fuchsia-700 dark:text-fuchsia-300",
    ring: "ring-fuchsia-400/50",
    dot: "bg-fuchsia-500",
    ...sharedText,
  },
  green: {
    card:
      "from-green-50 via-white to-green-50/30 border-green-100 dark:from-green-950/70 dark:via-slate-900 dark:to-green-950/40 dark:border-green-800/60",
    icon: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-100 dark:bg-green-900/50",
    value: "text-green-700 dark:text-green-300",
    ring: "ring-green-400/50",
    dot: "bg-green-500",
    ...sharedText,
  },
  violet: {
    card:
      "from-violet-50 via-white to-violet-50/30 border-violet-100 dark:from-violet-950/70 dark:via-slate-900 dark:to-violet-950/40 dark:border-violet-800/60",
    icon: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/50",
    value: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-400/50",
    dot: "bg-violet-500",
    ...sharedText,
  },
  pink: {
    card:
      "from-pink-50 via-white to-pink-50/30 border-pink-100 dark:from-pink-950/70 dark:via-slate-900 dark:to-pink-950/40 dark:border-pink-800/60",
    icon: "text-pink-600 dark:text-pink-400",
    iconBg: "bg-pink-100 dark:bg-pink-900/50",
    value: "text-pink-700 dark:text-pink-300",
    ring: "ring-pink-400/50",
    dot: "bg-pink-500",
    ...sharedText,
  },
  sky: {
    card:
      "from-sky-50 via-white to-sky-50/30 border-sky-100 dark:from-sky-950/70 dark:via-slate-900 dark:to-sky-950/40 dark:border-sky-800/60",
    icon: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-100 dark:bg-sky-900/50",
    value: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-400/50",
    dot: "bg-sky-500",
    ...sharedText,
  },
};

export type MiniTileAccentStyle = {
  color: string;
  bg: string;
  ring: string;
};

const miniTileAccentStyles: Record<string, MiniTileAccentStyle> = {
  blue: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/50",
    ring: "ring-blue-100 dark:ring-blue-900/60",
  },
  emerald: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    ring: "ring-emerald-100 dark:ring-emerald-900/60",
  },
  orange: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/50",
    ring: "ring-orange-100 dark:ring-orange-900/60",
  },
  purple: {
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/50",
    ring: "ring-purple-100 dark:ring-purple-900/60",
  },
  lime: {
    color: "text-lime-700 dark:text-lime-400",
    bg: "bg-lime-50 dark:bg-lime-950/50",
    ring: "ring-lime-100 dark:ring-lime-900/60",
  },
  indigo: {
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/50",
    ring: "ring-indigo-100 dark:ring-indigo-900/60",
  },
  teal: {
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/50",
    ring: "ring-teal-100 dark:ring-teal-900/60",
  },
  slate: {
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/50",
    ring: "ring-slate-100 dark:ring-slate-800/60",
  },
  amber: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
    ring: "ring-amber-100 dark:ring-amber-900/60",
  },
  rose: {
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/50",
    ring: "ring-rose-100 dark:ring-rose-900/60",
  },
  red: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/50",
    ring: "ring-red-100 dark:ring-red-900/60",
  },
  cyan: {
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/50",
    ring: "ring-cyan-100 dark:ring-cyan-900/60",
  },
  fuchsia: {
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/50",
    ring: "ring-fuchsia-100 dark:ring-fuchsia-900/60",
  },
  green: {
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/50",
    ring: "ring-green-100 dark:ring-green-900/60",
  },
  violet: {
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/50",
    ring: "ring-violet-100 dark:ring-violet-900/60",
  },
  pink: {
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-950/50",
    ring: "ring-pink-100 dark:ring-pink-900/60",
  },
  sky: {
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/50",
    ring: "ring-sky-100 dark:ring-sky-900/60",
  },
};

export function getTileAccent(accent: string): TileAccentStyle {
  return tileAccentStyles[accent] ?? tileAccentStyles.blue;
}

/** Compact mini-tile tokens derived from the full stat tile accent palette. */
export function getMiniTileAccent(accent: string): MiniTileAccentStyle {
  return miniTileAccentStyles[accent] ?? miniTileAccentStyles.blue;
}

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const AMBIENT_ORBS = [
  {
    className:
      "absolute -top-32 left-[15%] h-96 w-96 rounded-full bg-white/[0.04] blur-3xl dark:bg-white/[0.03]",
    animate: { x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.12, 1] },
    duration: 20,
  },
  {
    className:
      "absolute -bottom-40 right-[10%] h-[28rem] w-[28rem] rounded-full bg-slate-400/[0.06] blur-3xl dark:bg-white/[0.02]",
    animate: { x: [0, -35, 0], y: [0, 25, 0], scale: [1, 1.08, 1] },
    duration: 24,
  },
  {
    className:
      "absolute top-1/3 right-[20%] h-72 w-72 rounded-full bg-white/[0.03] blur-3xl",
    animate: { x: [0, 25, 0], y: [0, 20, 0], scale: [1, 1.15, 1] },
    duration: 16,
  },
];

interface LoginAmbientBackgroundProps {
  showRings?: boolean;
  className?: string;
  /** When true, always renders the dark/black palette regardless of theme. */
  forcedDark?: boolean;
}

export function LoginAmbientBackground({
  showRings = true,
  className,
  forcedDark = false,
}: LoginAmbientBackgroundProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-0",
          forcedDark ? "bg-black" : "bg-slate-100 dark:bg-black",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 [background-size:22px_22px] opacity-40",
          forcedDark
            ? "bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] opacity-50"
            : "bg-[radial-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] dark:opacity-50",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          forcedDark
            ? "from-black via-slate-950 to-black"
            : "from-slate-100 via-background to-slate-200/80 dark:from-black dark:via-slate-950 dark:to-black",
        )}
      />

      {AMBIENT_ORBS.map((orb, index) => (
        <motion.div
          key={index}
          animate={orb.animate}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
          className={
            forcedDark
              ? cn(
                  orb.className
                    .split(" ")
                    .filter((c) => !c.startsWith("bg-") && !c.startsWith("dark:bg-"))
                    .join(" "),
                  "bg-white/[0.03]",
                )
              : orb.className
          }
        />
      ))}

      {showRings && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
            className={cn(
              "absolute left-1/2 top-1/2 h-[min(90vw,42rem)] w-[min(90vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border",
              forcedDark ? "border-white/[0.06]" : "border-border/40 dark:border-white/[0.06]",
            )}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
            className={cn(
              "absolute left-1/2 top-1/2 h-[min(70vw,32rem)] w-[min(70vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border",
              forcedDark ? "border-white/[0.04]" : "border-border/30 dark:border-white/[0.04]",
            )}
          />
        </>
      )}

      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.1, 0.35, 0.1], scale: [0.8, 1.2, 0.8] }}
          transition={{
            duration: 3 + i * 0.4,
            repeat: Infinity,
            delay: i * 0.35,
            ease: "easeInOut",
          }}
          className={cn(
            "absolute h-1 w-1 rounded-full",
            forcedDark
              ? "bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.25)]"
              : "bg-slate-400/60 shadow-[0_0_10px_rgba(148,163,184,0.35)] dark:bg-white/50 dark:shadow-[0_0_10px_rgba(255,255,255,0.25)]",
          )}
          style={{
            top: `${12 + i * 14}%`,
            left: `${8 + (i % 3) * 28}%`,
          }}
        />
      ))}
    </div>
  );
}

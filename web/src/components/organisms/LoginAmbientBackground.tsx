import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const AMBIENT_ORBS = [
  {
    className: "absolute -top-32 left-[15%] h-96 w-96 rounded-full bg-primary-500/25 blur-3xl",
    animate: { x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.12, 1] },
    duration: 20,
  },
  {
    className:
      "absolute -bottom-40 right-[10%] h-[28rem] w-[28rem] rounded-full bg-accent-500/20 blur-3xl",
    animate: { x: [0, -35, 0], y: [0, 25, 0], scale: [1, 1.08, 1] },
    duration: 24,
  },
  {
    className: "absolute top-1/3 right-[20%] h-72 w-72 rounded-full bg-primary-400/15 blur-3xl",
    animate: { x: [0, 25, 0], y: [0, 20, 0], scale: [1, 1.15, 1] },
    duration: 16,
  },
];

interface LoginAmbientBackgroundProps {
  showRings?: boolean;
  className?: string;
}

export function LoginAmbientBackground({
  showRings = true,
  className,
}: LoginAmbientBackgroundProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      <div className="absolute inset-0 bg-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(99,102,241,0.09)_1px,transparent_1px)] [background-size:22px_22px] opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950" />

      {AMBIENT_ORBS.map((orb, index) => (
        <motion.div
          key={index}
          animate={orb.animate}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
          className={orb.className}
        />
      ))}

      {showRings && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 h-[min(90vw,42rem)] w-[min(90vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary-500/10"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 h-[min(70vw,32rem)] w-[min(70vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-500/10"
          />
        </>
      )}

      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.15, 0.55, 0.15], scale: [0.8, 1.2, 0.8] }}
          transition={{
            duration: 3 + i * 0.4,
            repeat: Infinity,
            delay: i * 0.35,
            ease: "easeInOut",
          }}
          className="absolute h-1 w-1 rounded-full bg-primary-300 shadow-[0_0_10px_theme(colors.primary.300)]"
          style={{
            top: `${12 + i * 14}%`,
            left: `${8 + (i % 3) * 28}%`,
          }}
        />
      ))}
    </div>
  );
}

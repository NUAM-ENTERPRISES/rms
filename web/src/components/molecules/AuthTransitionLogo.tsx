import { motion } from "framer-motion";
import { BrandLogo } from "@/components/molecules/BrandLogo";

const LOGO_SPARKS = [
  { top: "8%", left: "12%", delay: 0.3 },
  { top: "18%", right: "8%", delay: 0.5 },
  { bottom: "12%", left: "20%", delay: 0.7 },
  { bottom: "20%", right: "16%", delay: 0.9 },
] as const;

/** Animated brand logo card shared by login/logout transition screens. */
export function AuthTransitionLogo() {
  return (
    <div className="relative mb-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 16 }}
        className="relative"
      >
        <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-white/10 via-slate-400/10 to-white/10 blur-2xl dark:from-white/10 dark:via-slate-400/10 dark:to-white/10" />

        <div className="relative overflow-hidden rounded-[1.75rem] p-[2px] shadow-[0_0_60px_rgba(0,0,0,0.2)] dark:shadow-[0_0_60px_rgba(255,255,255,0.08)]">
          <div className="absolute inset-[-200%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_30%,rgba(148,163,184,0.35)_55%,rgba(255,255,255,0.2)_75%,transparent_100%)] opacity-80" />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 18,
              delay: 0.15,
            }}
            className="relative rounded-[1.65rem] bg-card/95 px-6 py-6 backdrop-blur-2xl dark:bg-black/90 sm:px-8 sm:py-7"
          >
            <motion.div
              initial={{ y: 12, opacity: 0, filter: "blur(8px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{
                duration: 0.6,
                delay: 0.25,
                ease: "easeOut",
              }}
              className="flex justify-center"
            >
              <BrandLogo variant="auth" />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {LOGO_SPARKS.map((particle, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.5] }}
          transition={{
            duration: 1.2,
            delay: particle.delay,
            repeat: Infinity,
            repeatDelay: 1.5,
          }}
          style={{
            top: "top" in particle ? particle.top : undefined,
            left: "left" in particle ? particle.left : undefined,
            right: "right" in particle ? particle.right : undefined,
            bottom: "bottom" in particle ? particle.bottom : undefined,
          }}
          className="absolute h-1.5 w-1.5 rounded-full bg-slate-400 shadow-[0_0_12px_rgba(148,163,184,0.45)] dark:bg-white/70 dark:shadow-[0_0_12px_rgba(255,255,255,0.35)]"
        />
      ))}
    </div>
  );
}

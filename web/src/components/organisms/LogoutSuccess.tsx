import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoutSuccessProps {
  isVisible: boolean;
  userName?: string;
  onComplete?: () => void;
}

const TRANSITION_DURATION_MS = 2400;
const REDUCED_MOTION_DURATION_MS = 450;

const SHUTTER_PANELS = [
  { from: "left", className: "left-0 top-0 h-full w-1/2 origin-left" },
  { from: "right", className: "right-0 top-0 h-full w-1/2 origin-right" },
] as const;

const LOGO_SPARKS = [
  { top: "8%", left: "12%", delay: 0.3 },
  { top: "18%", right: "8%", delay: 0.5 },
  { bottom: "12%", left: "20%", delay: 0.7 },
  { bottom: "20%", right: "16%", delay: 0.9 },
] as const;

export const LogoutSuccess = ({
  isVisible,
  userName,
  onComplete,
}: LogoutSuccessProps) => {
  useEffect(() => {
    if (!isVisible || !onComplete) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const duration = prefersReducedMotion
      ? REDUCED_MOTION_DURATION_MS
      : TRANSITION_DURATION_MS;

    const timerId = window.setTimeout(onComplete, duration);
    return () => window.clearTimeout(timerId);
  }, [isVisible, onComplete]);

  const firstName = userName?.split(" ")[0];
  const headline = firstName ? `Goodbye, ${firstName}` : "Logged Out";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-label={`Signed out. ${headline}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[200] overflow-hidden"
        >
          {/* Backdrop — matches login success overlay */}
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" />
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
            <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-accent-500/25 blur-3xl" />
          </motion.div>

          {/* Login-success style card */}
          <div className="relative z-20 flex min-h-screen items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 18 }}
              className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/80 shadow-[0_0_80px_-12px_rgba(99,102,241,0.45)] backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(99,102,241,0.08)_1px,transparent_1px)] [background-size:20px_20px] opacity-50" />

              <div className="relative flex flex-col items-center px-8 py-10 text-center sm:px-10 sm:py-12">
                {/* Logo halo + spinning ring — same as login success */}
                <div className="relative mb-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 120, damping: 16 }}
                    className="relative"
                  >
                    <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-r from-primary-500/40 via-accent-500/40 to-primary-400/40 blur-2xl" />

                    <div className="relative overflow-hidden rounded-[1.75rem] p-[2px] shadow-[0_0_60px_rgba(99,102,241,0.35)]">
                      <div className="absolute inset-[-200%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_30%,theme(colors.primary.400)_55%,theme(colors.accent.400)_75%,transparent_100%)] opacity-80" />

                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 18,
                          delay: 0.15,
                        }}
                        className="relative rounded-[1.65rem] bg-slate-950/95 px-7 py-6 backdrop-blur-2xl sm:px-8 sm:py-7"
                      >
                        <motion.img
                          src="/logo.png"
                          alt="Affiniks RMS"
                          initial={{ y: 12, opacity: 0, filter: "blur(8px)" }}
                          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                          transition={{
                            duration: 0.6,
                            delay: 0.25,
                            ease: "easeOut",
                          }}
                          className="h-16 w-auto drop-shadow-2xl sm:h-20"
                        />
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
                        top: particle.top,
                        left: particle.left,
                        right: particle.right,
                        bottom: particle.bottom,
                      }}
                      className="absolute h-1.5 w-1.5 rounded-full bg-primary-300 shadow-[0_0_12px_theme(colors.primary.300)]"
                    />
                  ))}
                </div>

                <motion.p
                  initial={{ opacity: 0, letterSpacing: "0.5em" }}
                  animate={{ opacity: 1, letterSpacing: "0.35em" }}
                  transition={{ duration: 0.7, delay: 0.35 }}
                  className="mb-3 text-[10px] font-semibold uppercase text-slate-400"
                >
                  Affiniks RMS
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.4 }}
                  className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary-400"
                >
                  Session ended
                </motion.p>

                {/* Kinetic headline — login success typography */}
                <h2 className="mb-3 flex flex-wrap items-center justify-center gap-x-[0.08em] text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
                  {headline.split("").map((char, index) => (
                    <motion.span
                      key={`${char}-${index}`}
                      initial={{ opacity: 0, y: 24, rotateX: -90 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 140,
                        damping: 14,
                        delay: 0.5 + index * 0.028,
                      }}
                      style={{
                        transformOrigin: "bottom center",
                        display: "inline-block",
                      }}
                      className={cn(
                        "bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent",
                        char === " " && "w-2"
                      )}
                    >
                      {char}
                    </motion.span>
                  ))}
                  <motion.span
                    initial={{ opacity: 0, scale: 0, rotate: -30 }}
                    animate={{ opacity: 1, scale: 1, rotate: [0, 14, -10, 6, 0] }}
                    transition={{
                      delay: 0.5 + headline.length * 0.028 + 0.08,
                      duration: 0.9,
                      ease: "easeInOut",
                    }}
                    className="ml-1 inline-block text-xl sm:text-2xl"
                    aria-hidden
                  >
                    👋
                  </motion.span>
                </h2>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.95, duration: 0.5 }}
                  className="max-w-xs text-sm font-medium leading-relaxed text-slate-400"
                >
                  Your session was closed securely. Redirecting to sign in…
                </motion.p>

                {/* Progress track — login success style */}
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "12rem" }}
                  transition={{ delay: 0.75, duration: 0.4 }}
                  className="mt-8 h-1 overflow-hidden rounded-full bg-slate-800"
                >
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                      duration: 1.9,
                      delay: 0.85,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 via-accent-500 to-primary-400 shadow-[0_0_20px_theme(colors.primary.400)]"
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Logout-only: vault shutters at end */}
          {SHUTTER_PANELS.map((panel, index) => (
            <motion.div
              key={panel.from}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                delay: 1.55 + index * 0.08,
                duration: 0.55,
                ease: [0.65, 0, 0.35, 1],
              }}
              className={`pointer-events-none absolute z-30 bg-gradient-to-b from-slate-900 to-slate-800 ${panel.className}`}
            />
          ))}

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 0, 0.85], scale: [0.85, 1, 2.4] }}
            transition={{ duration: 2.4, times: [0, 0.88, 1], ease: "easeIn" }}
            className="pointer-events-none absolute inset-0 z-40 bg-gradient-to-br from-primary-500/30 via-accent-500/20 to-transparent"
          />

          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

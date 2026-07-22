import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LoginAmbientBackground } from "@/components/organisms/LoginAmbientBackground";
import { AuthTransitionLogo } from "@/components/molecules/AuthTransitionLogo";

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
          className="fixed inset-0 z-[200] overflow-hidden bg-background dark:bg-black"
        >
          <LoginAmbientBackground showRings={false} />

          {/* Success card */}
          <div className="relative z-20 flex min-h-screen items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex max-w-md flex-col items-center text-center"
            >
              <AuthTransitionLogo />

              <motion.p
                initial={{ opacity: 0, letterSpacing: "0.5em" }}
                animate={{ opacity: 1, letterSpacing: "0.35em" }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="mb-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-widest"
              >
                Recruitment Management System
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42, duration: 0.4 }}
                className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground dark:text-slate-400"
              >
                Session ended
              </motion.p>

              <h2 className="mb-3 flex flex-wrap items-center justify-center gap-x-[0.08em] text-xl font-black uppercase tracking-tight sm:text-2xl">
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
                      "bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent dark:from-white dark:to-slate-400",
                      char === " " && "w-2",
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
                className="max-w-xs text-sm font-medium leading-relaxed text-muted-foreground"
              >
                Your session was closed securely. Redirecting to sign in…
              </motion.p>

              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "12rem" }}
                transition={{ delay: 0.75, duration: 0.4 }}
                className="mt-8 h-1 overflow-hidden rounded-full bg-muted dark:bg-slate-800"
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: 1.9,
                    delay: 0.85,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="h-full rounded-full bg-gradient-to-r from-slate-600 via-slate-400 to-slate-500 shadow-[0_0_20px_rgba(148,163,184,0.25)] dark:from-white dark:via-slate-300 dark:to-white dark:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Vault shutters close at end */}
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
              className={`pointer-events-none absolute z-30 bg-gradient-to-b from-background via-muted to-background dark:from-slate-900 dark:via-slate-950 dark:to-slate-800 ${panel.className}`}
            />
          ))}

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

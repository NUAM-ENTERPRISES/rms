import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LoginAmbientBackground } from "@/components/organisms/LoginAmbientBackground";
import { AuthTransitionLogo } from "@/components/molecules/AuthTransitionLogo";

interface LoginSuccessTransitionProps {
  isVisible: boolean;
  userName?: string;
  onComplete: () => void;
}

const GATE_PANELS = [
  { id: "left", className: "left-0 top-0 h-full w-1/2 origin-left" },
  { id: "right", className: "right-0 top-0 h-full w-1/2 origin-right" },
] as const;

const SHUTTER_EASE = [0.65, 0, 0.35, 1] as const;
const SHUTTER_DURATION_S = 0.55;
const SHUTTER_STAGGER_S = 0.08;

const SUCCESS_CARD_MS = 2400;
const GATE_OPEN_MS = 650;
const REDUCED_MOTION_MS = 450;

export function LoginSuccessTransition({
  isVisible,
  userName = "User",
  onComplete,
}: LoginSuccessTransitionProps) {
  const [gatesOpening, setGatesOpening] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setGatesOpening(false);
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      const timer = window.setTimeout(onComplete, REDUCED_MOTION_MS);
      return () => window.clearTimeout(timer);
    }

    const openGatesTimer = window.setTimeout(
      () => setGatesOpening(true),
      SUCCESS_CARD_MS
    );
    const completeTimer = window.setTimeout(
      onComplete,
      SUCCESS_CARD_MS + GATE_OPEN_MS
    );

    return () => {
      window.clearTimeout(openGatesTimer);
      window.clearTimeout(completeTimer);
    };
  }, [isVisible, onComplete]);

  const firstName = userName.split(" ")[0] ?? userName;
  const welcomeText = `Welcome back, ${firstName}`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-label={
            gatesOpening
              ? `Opening your dashboard. ${welcomeText}`
              : `Signing you in. ${welcomeText}`
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: gatesOpening ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: gatesOpening ? 0.25 : 0.35,
            delay: gatesOpening ? 0.42 : 0,
            ease: "easeInOut",
          }}
          className="fixed inset-0 z-[100] overflow-hidden bg-background dark:bg-black"
        >
          <LoginAmbientBackground showRings={!gatesOpening} />

          {/* Vault gates — open outward (logout close inverse) */}
          {GATE_PANELS.map((panel, index) => (
            <motion.div
              key={panel.id}
              initial={false}
              animate={{ scaleX: gatesOpening ? 0 : 1 }}
              transition={{
                delay: gatesOpening ? index * SHUTTER_STAGGER_S : 0,
                duration: SHUTTER_DURATION_S,
                ease: SHUTTER_EASE,
              }}
              className={`pointer-events-none absolute z-20 bg-gradient-to-b from-background via-muted to-background dark:from-slate-900 dark:via-slate-950 dark:to-slate-800 ${panel.className}`}
            />
          ))}

          {/* Success card — only while gates are closed */}
          {!gatesOpening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="relative z-40 flex min-h-screen w-full items-center justify-center px-6"
            >
              <div className="flex max-w-md flex-col items-center text-center">
                <AuthTransitionLogo />

                <motion.p
                  initial={{ opacity: 0, letterSpacing: "0.5em" }}
                  animate={{ opacity: 1, letterSpacing: "0.35em" }}
                  transition={{ duration: 0.7, delay: 0.4 }}
                  className="mb-4 text-[10px] font-semibold uppercase text-muted-foreground tracking-widest"
                >
                  Recruitment Management System
                </motion.p>

                <h2 className="mb-3 flex flex-wrap items-center justify-center gap-x-[0.08em] text-2xl font-black uppercase tracking-tight md:text-3xl">
                  {welcomeText.split("").map((char, index) => (
                    <motion.span
                      key={`${char}-${index}`}
                      initial={{ opacity: 0, y: 24, rotateX: -90 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 140,
                        damping: 14,
                        delay: 0.55 + index * 0.025,
                      }}
                      style={{
                        transformOrigin: "bottom center",
                        display: "inline-block",
                      }}
                      className={cn(
                        "bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent dark:from-white dark:to-slate-400",
                        char === " " && "w-2"
                      )}
                    >
                      {char}
                    </motion.span>
                  ))}
                </h2>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1, duration: 0.5 }}
                  className="max-w-xs text-sm font-medium text-muted-foreground"
                >
                  Preparing your recruitment dashboard…
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "12rem" }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                  className="mt-8 h-1 overflow-hidden rounded-full bg-muted dark:bg-slate-800"
                >
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                      duration: 1.9,
                      delay: 0.9,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="h-full rounded-full bg-gradient-to-r from-slate-600 via-slate-400 to-slate-500 shadow-[0_0_20px_rgba(148,163,184,0.35)] dark:from-white dark:via-slate-300 dark:to-white dark:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                  />
                </motion.div>
              </div>
            </motion.div>
          )}

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

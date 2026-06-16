import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DispatchPhase = "throw" | "drive" | "success";

interface DispatchAnimationSceneProps {
  phase: DispatchPhase;
  onThrowComplete: () => void;
  onDriveComplete: () => void;
}

export function DispatchAnimationScene({
  phase,
  onThrowComplete,
  onDriveComplete,
}: DispatchAnimationSceneProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-5">
        <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-teal-200/40 blur-2xl" />
        <span className="pointer-events-none absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-emerald-200/35 blur-2xl" />
        <div className="rounded-2xl border border-teal-200/70 bg-white/70 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900">Dispatch</p>
              <p className="text-[11px] text-slate-600">
                {phase === "success" ? "Dispatched successfully." : "Processing..."}
              </p>
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            {phase === "success" ? "Dispatched successfully." : "Dispatch in progress."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-5">
      <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-teal-200/40 blur-2xl" />
      <span className="pointer-events-none absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-emerald-200/35 blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-teal-200/70 bg-white/70 p-4">
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 text-white shadow-sm">
              <CourierPerson phase={phase} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900">Handover</p>
              <p className="text-[11px] text-slate-600">Packing originals</p>
            </div>
          </div>

          <div className="relative flex-1">
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-teal-200 via-emerald-200 to-teal-200" />
            <ThrowPath />

            {phase === "throw" ? (
              <motion.div
                className="absolute left-2 top-1/2 -translate-y-1/2"
                initial={false}
                animate={{ x: ["0%", "46%", "68%"], y: [0, -26, -10], rotate: [0, 18, 8] }}
                transition={{ duration: 0.95, ease: "easeInOut" }}
                onAnimationComplete={() => {
                  onThrowComplete();
                }}
              >
                <motion.div
                  initial={false}
                  animate={{ scale: [1, 1.06, 0.96, 1] }}
                  transition={{ duration: 0.45, times: [0, 0.35, 0.7, 1] }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 text-amber-800 shadow-sm"
                >
                  <BoxIcon />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                className="absolute right-7 top-1/2 -translate-y-1/2"
                initial={{ opacity: 0, scale: 0.9, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                aria-hidden="true"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 text-amber-800 shadow-sm">
                  <BoxIcon />
                </div>
              </motion.div>
            )}
          </div>

          <motion.div
            className="relative flex items-center gap-3"
            animate={
              phase === "drive"
                ? { x: [0, 280], opacity: [1, 1] }
                : { y: [0, -2, 0] }
            }
            transition={{
              duration: phase === "drive" ? 1.1 : 1.25,
              ease: "easeInOut",
              repeat: phase === "drive" ? 0 : Infinity,
            }}
            onAnimationComplete={() => {
              if (phase !== "drive") return;
              onDriveComplete();
            }}
          >
            {phase === "drive" ? <SpeedLines /> : null}
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-md ring-4 ring-white">
              <TruckIcon />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-900">Dispatch</p>
              <p className="text-[11px] text-slate-600">Moving to next office</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {phase === "success" ? "Dispatched successfully." : "Dispatch in progress."}
      </div>

      {phase === "success" ? (
        <div
          className={cn(
            "mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-emerald-900",
          )}
        >
          Dispatched successfully.
        </div>
      ) : null}
    </div>
  );
}

function ThrowPath() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 300 32"
      aria-hidden="true"
    >
      <path
        d="M20 24 C 110 4, 190 4, 278 22"
        fill="none"
        stroke="currentColor"
        className="text-emerald-300/60"
        strokeWidth="2"
        strokeDasharray="4 6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpeedLines() {
  return (
    <div className="pointer-events-none absolute -left-10 top-1/2 hidden -translate-y-1/2 sm:block">
      <div className="flex items-center gap-2 opacity-60">
        <span className="h-0.5 w-8 rounded-full bg-emerald-200" />
        <span className="h-0.5 w-5 rounded-full bg-teal-200" />
        <span className="h-0.5 w-3 rounded-full bg-emerald-100" />
      </div>
    </div>
  );
}

function CourierPerson({ phase }: { phase: DispatchPhase }) {
  const armRotate = phase === "throw" ? -18 : -6;
  const forearmRotate = phase === "throw" ? -34 : -10;
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <circle cx="18" cy="13" r="6" className="opacity-90" />
        <path d="M18 20 L18 34" className="opacity-90" />
        <path d="M18 34 L10 43" className="opacity-90" />
        <path d="M18 34 L26 43" className="opacity-90" />
      </g>
      <g
        style={{
          transformOrigin: "18px 24px",
          transform: `rotate(${armRotate}deg)`,
          transition: "transform 240ms ease",
        }}
      >
        <path
          d="M18 24 L30 22"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="opacity-90"
        />
        <g
          style={{
            transformOrigin: "30px 22px",
            transform: `rotate(${forearmRotate}deg)`,
            transition: "transform 240ms ease",
          }}
        >
          <path
            d="M30 22 L38 18"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-90"
          />
        </g>
      </g>
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 8 L12 4 L20 8 L12 12 Z"
        fill="currentColor"
        className="text-amber-700/80"
      />
      <path
        d="M4 8 V16 L12 20 V12 Z"
        fill="currentColor"
        className="text-amber-800/80"
      />
      <path
        d="M20 8 V16 L12 20 V12 Z"
        fill="currentColor"
        className="text-amber-600/70"
      />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M2 7.5 C2 6.7 2.7 6 3.5 6 H14.5 C15.3 6 16 6.7 16 7.5 V14 H2 V7.5 Z"
        fill="currentColor"
        className="text-white"
        opacity="0.92"
      />
      <path
        d="M16 9 H19.2 C19.6 9 19.9 9.2 20.1 9.5 L22 13 V14 H16 V9 Z"
        fill="currentColor"
        className="text-white"
        opacity="0.92"
      />
      <path
        d="M6 16.5 a2 2 0 1 0 0.01 0 Z"
        fill="currentColor"
        className="text-white"
      />
      <path
        d="M18 16.5 a2 2 0 1 0 0.01 0 Z"
        fill="currentColor"
        className="text-white"
      />
      <path
        d="M16 8.5 H14.5"
        stroke="currentColor"
        className="text-white/80"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Footprints, Loader2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { DELIVERY_MODE } from "../constants";

const CONFETTI = [
  { x: -72, y: -48, color: "bg-teal-400", delay: 0.05 },
  { x: 68, y: -56, color: "bg-emerald-400", delay: 0.12 },
  { x: -88, y: 12, color: "bg-cyan-400", delay: 0.18 },
  { x: 92, y: 8, color: "bg-teal-300", delay: 0.08 },
  { x: -48, y: 64, color: "bg-emerald-300", delay: 0.22 },
  { x: 54, y: 72, color: "bg-teal-500", delay: 0.15 },
  { x: 0, y: -80, color: "bg-emerald-500", delay: 0.1 },
  { x: -24, y: 88, color: "bg-cyan-300", delay: 0.2 },
  { x: 36, y: -36, color: "bg-teal-200", delay: 0.14 },
  { x: -60, y: -20, color: "bg-emerald-200", delay: 0.16 },
  { x: 76, y: 44, color: "bg-cyan-500", delay: 0.11 },
  { x: -16, y: -64, color: "bg-teal-600", delay: 0.19 },
] as const;

interface DispatchSuccessAnimationProps {
  deliveryMode: typeof DELIVERY_MODE.COURIER | typeof DELIVERY_MODE.DIRECT;
  courierPartner?: string;
  trackingId?: string;
  phase: "processing" | "success";
  onComplete: () => void;
}

export function DispatchSuccessAnimation({
  deliveryMode,
  courierPartner,
  trackingId,
  phase,
  onComplete,
}: DispatchSuccessAnimationProps) {
  const reducedMotion = useReducedMotion();
  const isCourier = deliveryMode === DELIVERY_MODE.COURIER;

  useEffect(() => {
    if (phase !== "success") return;
    const delay = reducedMotion ? 900 : 2600;
    const timer = window.setTimeout(onComplete, delay);
    return () => window.clearTimeout(timer);
  }, [phase, onComplete, reducedMotion]);

  const title = isCourier ? "Courier dispatched" : "Handover confirmed";
  const subtitle = isCourier
    ? "Documents are on their way to the next office."
    : "Direct handover has been recorded successfully.";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-8",
        isCourier
          ? "border-teal-200/70 bg-gradient-to-br from-teal-50 via-white to-emerald-50"
          : "border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-violet-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl",
          isCourier ? "bg-teal-200/50" : "bg-indigo-200/45",
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute -bottom-14 -left-14 h-44 w-44 rounded-full blur-3xl",
          isCourier ? "bg-emerald-200/40" : "bg-violet-200/35",
        )}
      />

      <div className="relative flex min-h-[220px] flex-col items-center justify-center text-center">
        {phase === "processing" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full shadow-lg ring-8",
                isCourier
                  ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white ring-teal-100"
                  : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white ring-indigo-100",
              )}
            >
              <Loader2 className="h-9 w-9 animate-spin" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                {isCourier ? "Dispatching courier..." : "Confirming handover..."}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Saving leg and updating records
              </p>
            </div>
          </motion.div>
        ) : (
          <>
            {!reducedMotion &&
              CONFETTI.map((piece, index) => (
                <motion.span
                  key={index}
                  className={cn("absolute h-2 w-2 rounded-full", piece.color)}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: piece.x,
                    y: piece.y,
                    scale: [0, 1.2, 0.6],
                  }}
                  transition={{
                    duration: 1.1,
                    delay: 0.15 + piece.delay,
                    ease: "easeOut",
                  }}
                  aria-hidden="true"
                />
              ))}

            {!reducedMotion && (
              <>
                <motion.span
                  className={cn(
                    "absolute h-28 w-28 rounded-full border-2",
                    isCourier ? "border-teal-300/50" : "border-indigo-300/50",
                  )}
                  initial={{ opacity: 0.8, scale: 0.4 }}
                  animate={{ opacity: 0, scale: 1.8 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  aria-hidden="true"
                />
                <motion.span
                  className={cn(
                    "absolute h-28 w-28 rounded-full border-2",
                    isCourier ? "border-emerald-300/40" : "border-violet-300/40",
                  )}
                  initial={{ opacity: 0.6, scale: 0.5 }}
                  animate={{ opacity: 0, scale: 2.2 }}
                  transition={{ duration: 1.4, delay: 0.15, ease: "easeOut" }}
                  aria-hidden="true"
                />
              </>
            )}

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={
                reducedMotion
                  ? { duration: 0.2 }
                  : { type: "spring", stiffness: 260, damping: 18, delay: 0.05 }
              }
              className={cn(
                "relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-xl ring-8",
                isCourier
                  ? "bg-gradient-to-br from-teal-500 to-emerald-600 ring-emerald-100"
                  : "bg-gradient-to-br from-indigo-500 to-violet-600 ring-violet-100",
              )}
            >
              <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
            </motion.div>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : 0.35, duration: 0.45 }}
              className="mt-5 space-y-2"
            >
              <div
                className={cn(
                  "mx-auto flex h-9 w-9 items-center justify-center rounded-xl",
                  isCourier
                    ? "bg-teal-100 text-teal-700"
                    : "bg-indigo-100 text-indigo-700",
                )}
              >
                {isCourier ? (
                  <Truck className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Footprints className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <p className="text-lg font-semibold text-slate-900">{title}</p>
              <p className="max-w-sm text-sm text-slate-600">{subtitle}</p>

              {isCourier && (courierPartner || trackingId) ? (
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reducedMotion ? 0 : 0.55, duration: 0.4 }}
                  className="mt-3 flex flex-wrap items-center justify-center gap-2"
                >
                  {courierPartner ? (
                    <span className="rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-xs font-medium text-teal-800">
                      {courierPartner}
                    </span>
                  ) : null}
                  {trackingId ? (
                    <code className="rounded-lg border border-teal-200/70 bg-white/80 px-2.5 py-1 text-xs text-teal-900">
                      {trackingId}
                    </code>
                  ) : null}
                </motion.div>
              ) : null}
            </motion.div>
          </>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {phase === "processing"
          ? isCourier
            ? "Dispatching courier."
            : "Confirming handover."
          : `${title}. ${subtitle}`}
      </p>
    </div>
  );
}

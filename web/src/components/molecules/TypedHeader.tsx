import React, { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface TypedHeaderProps {
  userName?: string;
  subtitle?: string;
  className?: string;
}

export default function TypedHeader({
  userName = "Recruiter",
  subtitle = "Orchestrate every panel with clarity and track candidate progress.",
  className = "",
}: TypedHeaderProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [showContent, setShowContent] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  const fullText = useMemo(() => `WELCOME, ${userName.toUpperCase()}`, [userName]);

  useEffect(() => {
    setDisplayedText("");
    setShowContent(false);
    setShouldShake(false);

    let index = 0;
    // UPDATED: Interval increased to 80ms for a "smoother, written" pace
    const intervalId = window.setInterval(() => {
      setDisplayedText(fullText.slice(0, index + 1));
      index += 1;

      if (index >= fullText.length) {
        window.clearInterval(intervalId);
        
        // Slight delay before hand appears for a natural feel
        setTimeout(() => {
          setShowContent(true);
          
          // Trigger the wave shortly after entry
          setTimeout(() => {
            setShouldShake(true);
          }, 400); 
        }, 200);
      }
    }, 80); // <--- Adjusted for smooth writing speed

    return () => window.clearInterval(intervalId);
  }, [fullText]);

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-slate-200/40 bg-white/40 p-[1px] transition-all duration-500",
      className
    )}>
      {/* Subtle Border Beam Effect */}
      <div className="absolute inset-0 z-0 opacity-100">
        <div className="absolute inset-[-150%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,#6366f1_360deg)]" />
      </div>

      <div className="relative z-10 rounded-[11px] bg-white/90 backdrop-blur-xl px-10 py-5">
        
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:15px_15px] opacity-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <h1 className="flex items-center flex-wrap gap-x-3 text-lg md:text-3xl font-black tracking-tighter text-slate-900 uppercase leading-none">
              <span className="tracking-[0.12em]">
                {displayedText}
              </span>

              {/* HAND UI: Wave movement (Smooth entry) */}
              <span className={cn(
                "inline-block text-2xl md:text-4xl will-change-transform transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]",
                showContent 
                  ? "opacity-100 scale-100 translate-y-0" 
                  : "opacity-0 scale-50 translate-y-2",
                shouldShake && "animate-[waveOnce_0.8s_ease-in-out_forwards]"
              )}>
                👋
              </span>

              <span className={cn(
                "h-6 w-1 bg-indigo-500 shadow-[0_0_10px_#6366f1] transition-opacity duration-300",
                showContent ? "animate-pulse" : "opacity-100"
              )} />
            </h1>

            <div className={cn(
              "overflow-hidden transition-all duration-1000",
              showContent ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            )}>
              <p className="relative inline-block text-[9px] md:text-[10px] font-bold tracking-[0.25em] uppercase text-slate-400">
                <span className="relative z-10">{subtitle}</span>
                <span className="absolute inset-0 z-20 animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/90 to-transparent bg-[length:200%_100%]" />
              </p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes waveOnce {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(18deg); }
          30% { transform: rotate(-12deg); }
          45% { transform: rotate(14deg); }
          60% { transform: rotate(-6deg); }
          75% { transform: rotate(4deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
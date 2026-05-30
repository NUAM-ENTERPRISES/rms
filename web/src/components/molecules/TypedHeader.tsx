// import React, { useEffect, useState, useMemo } from "react";
// import { cn } from "@/lib/utils";

// interface TypedHeaderProps {
//   userName?: string;
//   subtitle?: string;
//   className?: string;
// }

// export default function TypedHeader({
//   userName = "Recruiter",
//   subtitle = "Orchestrate every panel with clarity and track candidate progress.",
//   className = "",
// }: TypedHeaderProps) {
//   const [displayedText, setDisplayedText] = useState("");
//   const [showContent, setShowContent] = useState(false);
//   const [shouldShake, setShouldShake] = useState(false);

//   const fullText = useMemo(() => `WELCOME, ${userName.toUpperCase()}`, [userName]);

//   useEffect(() => {
//     setDisplayedText("");
//     setShowContent(false);
//     setShouldShake(false);

//     let index = 0;
//     // UPDATED: Interval increased to 80ms for a "smoother, written" pace
//     const intervalId = window.setInterval(() => {
//       setDisplayedText(fullText.slice(0, index + 1));
//       index += 1;

//       if (index >= fullText.length) {
//         window.clearInterval(intervalId);
        
//         // Slight delay before hand appears for a natural feel
//         setTimeout(() => {
//           setShowContent(true);
          
//           // Trigger the wave shortly after entry
//           setTimeout(() => {
//             setShouldShake(true);
//           }, 400); 
//         }, 200);
//       }
//     }, 80); // <--- Adjusted for smooth writing speed

//     return () => window.clearInterval(intervalId);
//   }, [fullText]);

//   return (
//     <div className={cn(
//       "relative overflow-hidden rounded-xl border border-slate-200/40 bg-white/40 p-[1px] transition-all duration-500",
//       className
//     )}>
//       {/* Subtle Border Beam Effect */}
//       <div className="absolute inset-0 z-0 opacity-100">
//         <div className="absolute inset-[-150%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,#6366f1_360deg)]" />
//       </div>

//       <div className="relative z-10 rounded-[11px] bg-white/90 backdrop-blur-xl px-10 py-5">
        
//         <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:15px_15px] opacity-20" />

//         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//           <div className="space-y-1.5 flex-1">
//             <h1 className="flex items-center flex-wrap gap-x-3 text-lg md:text-3xl font-black tracking-tighter text-slate-900 uppercase leading-none">
//               <span className="tracking-[0.12em]">
//                 {displayedText}
//               </span>

//               {/* HAND UI: Wave movement (Smooth entry) */}
//               <span className={cn(
//                 "inline-block text-2xl md:text-4xl will-change-transform transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]",
//                 showContent 
//                   ? "opacity-100 scale-100 translate-y-0" 
//                   : "opacity-0 scale-50 translate-y-2",
//                 shouldShake && "animate-[waveOnce_0.8s_ease-in-out_forwards]"
//               )}>
//                 👋
//               </span>

//               <span className={cn(
//                 "h-6 w-1 bg-indigo-500 shadow-[0_0_10px_#6366f1] transition-opacity duration-300",
//                 showContent ? "animate-pulse" : "opacity-100"
//               )} />
//             </h1>

//             <div className={cn(
//               "overflow-hidden transition-all duration-1000",
//               showContent ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
//             )}>
//               <p className="relative inline-block text-[9px] md:text-[10px] font-bold tracking-[0.25em] uppercase text-slate-400">
//                 <span className="relative z-10">{subtitle}</span>
//                 <span className="absolute inset-0 z-20 animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/90 to-transparent bg-[length:200%_100%]" />
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>

//       <style dangerouslySetInnerHTML={{ __html: `
//         @keyframes waveOnce {
//           0% { transform: rotate(0deg); }
//           15% { transform: rotate(18deg); }
//           30% { transform: rotate(-12deg); }
//           45% { transform: rotate(14deg); }
//           60% { transform: rotate(-6deg); }
//           75% { transform: rotate(4deg); }
//           100% { transform: rotate(0deg); }
//         }
//         @keyframes shimmer {
//           0% { background-position: -200% 0; }
//           100% { background-position: 200% 0; }
//         }
//         @keyframes spin {
//           from { transform: rotate(0deg); }
//           to { transform: rotate(360deg); }
//         }
//       `}} />
//     </div>
//   );
// }

import React, { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
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
  const cardRef = useRef<HTMLDivElement>(null);

  // Motion values for tracking mouse posture (3D effect)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth out mouse tracking using physics springs
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  // Map mouse position to 3D rotation angles
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  // Dynamic light glare coordinates based on mouse position
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    
    // Normalize mouse positions to coordinates between -0.5 and 0.5
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    
    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    // Smoothly snap back to dead center when mouse exits
    x.set(0);
    y.set(0);
  };

  // Convert string to array for character-by-character 3D staggering
  const titleText = `WELCOME, ${userName.toUpperCase()}`;

  return (
    <div 
      className="w-full perspective-[1200px] py-6"
      style={{ perspective: "1200px" }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/40 p-[1px] backdrop-blur-2xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] transition-shadow duration-500 hover:shadow-[0_50px_100px_-10px_rgba(99,102,241,0.15)]",
          className
        )}
      >
        {/* NEXT-LEVEL 3D BORDER BEAM EFFECT */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-xl">
          <div className="absolute inset-[-200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_40%,#6366f1_70%,#a855f7_90%,transparent_100%)] opacity-70" />
        </div>

        {/* INNER CONTAINER (Main Visual Canvas) */}
        <div 
          style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}
          // CHANGED: Reduced padding to py-4 md:py-5 for a super clean, low-breadth rectangle
          className="relative z-10 rounded-[11px] bg-slate-950/80 backdrop-blur-3xl px-4 py-4 md:py-5"
        >
          {/* Subtle Cyber Grid Layer */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(rgba(99,102,241,0.12)_1px,transparent_1px)] [background-size:20px_20px] opacity-40 rounded-[11px]" />

          {/* DYNAMIC REAL-TIME GLARE OVERLAY */}
          <motion.div 
            style={{
              background: useTransform(
                [glareX, glareY],
                ([gx, gy]) => `radial-gradient(circle 400px at ${gx} ${gy}, rgba(255,255,255,0.1), transparent)`
              )
            }}
            className="absolute inset-0 pointer-events-none z-30 rounded-[11px]"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              
              {/* 3D KINETIC TYPOGRAPHY */}
              <h1 className="flex items-center flex-wrap gap-x-[0.12em] text-xl md:text-2xl font-black tracking-normal text-white uppercase leading-none selection:bg-indigo-500">
                {titleText.split("").map((char, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 20, rotateX: -90 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 120,
                      damping: 14,
                      delay: index * 0.03,
                    }}
                    style={{ transformOrigin: "bottom center", display: "inline-block" }}
                    className={cn(
                      "bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 font-extrabold",
                      char === " " && "w-2.5"
                    )}
                  >
                    {char}
                  </motion.span>
                ))}

                {/* 3D WAVE EMOJI WITH SPRING PHYSICS */}
                <motion.span 
                  initial={{ opacity: 0, scale: 0, rotate: -45 }}
                  animate={{ opacity: 1, scale: 1, rotate: [0, 18, -14, 12, -4, 0] }}
                  transition={{ 
                    delay: titleText.length * 0.03 + 0.1,
                    duration: 1.1,
                    ease: "easeInOut"
                  }}
                  whileHover={{ 
                    scale: 1.25, 
                    rotate: [0, 20, -20, 20, 0],
                    transition: { duration: 0.4 }
                  }}
                  className="inline-block cursor-pointer text-2xl md:text-3xl ml-1.5 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] select-none origin-bottom-right"
                >
                  👋
                </motion.span>

                {/* CYBERPUNK AMBIENT CURSOR INDICATOR */}
                <motion.span 
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                  className="h-6 w-[3px] bg-gradient-to-b from-indigo-400 to-purple-500 shadow-[0_0_12px_#6366f1] ml-1.5 self-center rounded-full"
                />
              </h1>

              {/* CINEMATIC SUBTITLE LAYER */}
              <div style={{ transform: "translateZ(20px)" }} className="overflow-hidden">
                <motion.p 
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
                  className="relative inline-block text-[9px] md:text-[11px] font-medium tracking-[0.18em] uppercase text-slate-400 leading-none"
                >
                  <span className="relative z-10 bg-gradient-to-r from-slate-300 via-indigo-200 to-slate-400 bg-clip-text text-transparent">
                    {subtitle}
                  </span>
                  {/* Fluid glass reflection line sweeping across text */}
                  <span className="absolute inset-0 z-20 animate-[shimmer_4s_infinite_linear] bg-gradient-to-r from-transparent via-white/15 to-transparent bg-[length:200%_100%]" />
                </motion.p>
              </div>

            </div>
          </div>
        </div>
      </motion.div>

      {/* Global Optimization Styles for Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
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
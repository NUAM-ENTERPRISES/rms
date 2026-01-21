"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: "indigo" | "blue" | "green" | "red" | "purple" | "cyan" | "rose" | "emerald";
  index: number;
  compact?: boolean;
};

// Map colors to specific Tailwind classes to avoid dynamic string issues
const COLOR_VARIANTS = {
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-500/10",
  blue: "bg-blue-50 text-blue-600 border-blue-100 ring-blue-500/10",
  green: "bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10",
  red: "bg-red-50 text-red-600 border-red-100 ring-red-500/10",
  purple: "bg-purple-50 text-purple-600 border-purple-100 ring-purple-500/10",
  cyan: "bg-cyan-50 text-cyan-600 border-cyan-100 ring-cyan-500/10",
  rose: "bg-rose-50 text-rose-600 border-rose-100 ring-rose-500/10",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10",
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  index,
  compact = false,
}) => {
  const variant = COLOR_VARIANTS[color] || COLOR_VARIANTS.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.05, 
        duration: 0.4, 
        ease: [0.23, 1, 0.32, 1] 
      }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card
        className={cn(
          "relative overflow-hidden border border-white/40 bg-white/70 backdrop-blur-xl transition-all duration-300",
          "shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]",
          "group rounded-[2rem]",
          compact ? "p-0" : ""
        )}
      >
        {/* Sublte Internal Glow on Hover */}
        <div className={cn(
          "absolute -right-4 -top-4 h-16 w-16 rounded-full blur-2xl transition-opacity opacity-0 group-hover:opacity-20",
          variant.split(' ')[0] // Uses the background color for the glow
        )} />

        <CardContent className={cn("p-6", compact && "p-4")}>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn("h-1 w-1 rounded-full", variant.split(' ')[1])} />
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-[0.15em] text-slate-400",
                  compact && "text-[9px]"
                )}>
                  {label}
                </p>
              </div>
              
              <h3 className={cn(
                "text-2xl font-black tracking-tight text-slate-900",
                compact && "text-lg"
              )}>
                {value}
              </h3>
            </div>

            <div className={cn(
              "relative flex items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
              "h-12 w-12",
              variant,
              compact && "h-10 w-10 rounded-xl"
            )}>
              <Icon className={cn(
                "h-6 w-6",
                compact && "h-5 w-5"
              )} />
              
              {/* Outer Ring Effect */}
              <div className={cn(
                "absolute -inset-1.5 rounded-[1.25rem] border-2 border-current opacity-0 transition-all duration-500 group-hover:opacity-10 group-hover:-inset-2",
                compact && "group-hover:-inset-1"
              )} />
            </div>
          </div>

          {!compact && (
            <div className="mt-4 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: "60%" }} // Example: could be dynamic based on a "target" prop
                 className={cn("h-full opacity-60", variant.split(' ')[0])}
               />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
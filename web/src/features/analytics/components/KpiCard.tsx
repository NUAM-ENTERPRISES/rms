"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  index: number;
  compact?: boolean;
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  index,
  compact = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className={cn(
          `border-0 shadow-lg bg-gradient-to-br from-${color}-50 to-${color}-100/50 backdrop-blur-sm hover:shadow-xl transition-all`,
          compact && "shadow-md"
        )}
      >
        <CardContent className={cn("pt-6", compact && "pt-4 pb-4")}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cn(
                "text-sm font-medium text-slate-600 mb-1",
                compact && "text-xs mb-0.5"
              )}>
                {label}
              </p>
              <h3 className={cn(
                `text-3xl font-bold text-${color}-600`,
                compact && "text-xl"
              )}>
                {value}
              </h3>
            </div>
            <div className={cn(
              `p-3 bg-${color}-200/40 rounded-full`,
              compact && "p-2"
            )}>
              <Icon className={cn(
                `h-6 w-6 text-${color}-600`,
                compact && "h-4 w-4"
              )} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

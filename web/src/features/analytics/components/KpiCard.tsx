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
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className={cn(
          `border-0 shadow-lg bg-gradient-to-br from-${color}-50 to-${color}-100/50 backdrop-blur-sm hover:shadow-xl transition-all`
        )}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">
                {label}
              </p>
              <h3 className={`text-3xl font-bold text-${color}-600`}>
                {value}
              </h3>
            </div>
            <div className={`p-3 bg-${color}-200/40 rounded-full`}>
              <Icon className={`h-6 w-6 text-${color}-600`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface Props {
  count: number;
  active?: boolean;
  onClick?: () => void;
}

export default function ScreeningApprovedTile({ count, active, onClick }: Props) {
  const { theme } = useTheme();
  return (
    <Card
      className={cn(
        "border-0 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
        theme === "dark" ? "bg-slate-800" : "bg-gradient-to-br from-purple-50 to-purple-100/50",
        active ? "ring-2 ring-purple-300" : ""
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn("text-sm font-medium mb-1", theme === "dark" ? "text-white" : "text-slate-600")}>Screening Approved</p>
            <h3 className={cn("text-3xl font-bold", theme === "dark" ? "text-white" : "text-purple-600")}>
              {count}
            </h3>
            <p className={cn("text-xs mt-2", theme === "dark" ? "text-white" : "text-slate-500")}>Ready for verification</p>
          </div>
          <div className="p-3 bg-purple-200/40 rounded-full">
            <CheckCircle className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface Props {
  count: number;
  active?: boolean;
  onClick?: () => void;
}

export default function RejectedDocumentsTile({ count, active, onClick }: Props) {
  const { theme } = useTheme();
  return (
    <Card
      className={cn(
        "border-0 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
        theme === "dark" ? "bg-slate-800" : "bg-gradient-to-br from-red-50 to-red-100/50",
        active ? "ring-2 ring-red-300" : ""
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn("text-sm font-medium mb-1", theme === "dark" ? "text-white" : "text-slate-600")}>Rejected</p>
            <h3 className={cn("text-3xl font-bold", theme === "dark" ? "text-white" : "text-red-600")}>{count}</h3>
            <p className={cn("text-xs mt-2", theme === "dark" ? "text-white" : "text-slate-500")}>Not approved</p>
          </div>
          <div className="p-3 bg-red-200/40 rounded-full">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

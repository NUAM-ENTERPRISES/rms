import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  count: number;
  active?: boolean;
  onClick?: () => void;
}

export default function ScreeningApprovedTile({ count, active, onClick }: Props) {
  return (
    <Card
      className={cn(
        "border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
        active ? "ring-2 ring-purple-300" : ""
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Screening Approved</p>
            <h3 className="text-3xl font-bold text-purple-600">{count}</h3>
            <p className="text-xs text-slate-500 mt-2">Ready for verification</p>
          </div>
          <div className="p-3 bg-purple-200/40 rounded-full">
            <CheckCircle className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

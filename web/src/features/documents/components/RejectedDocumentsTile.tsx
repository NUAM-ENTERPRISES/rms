import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  count: number;
  active?: boolean;
  onClick?: () => void;
}

export default function RejectedDocumentsTile({ count, active, onClick }: Props) {
  return (
    <Card
      className={cn(
        "border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
        active ? "ring-2 ring-red-300" : ""
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Rejected</p>
            <h3 className="text-3xl font-bold text-red-600">{count}</h3>
            <p className="text-xs text-slate-500 mt-2">Not approved</p>
          </div>
          <div className="p-3 bg-red-200/40 rounded-full">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

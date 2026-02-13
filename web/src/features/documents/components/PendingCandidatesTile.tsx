import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  count: number;
  active?: boolean;
  onClick?: () => void;
}

export default function PendingCandidatesTile({ count, active, onClick }: Props) {
  return (
    <Card
      className={cn(
        "border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
        active ? "ring-2 ring-blue-300" : ""
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Pending Candidates</p>
            <h3 className="text-3xl font-bold text-blue-600">{count}</h3>
            <p className="text-xs text-slate-500 mt-2">For verification</p>
          </div>
          <div className="p-3 bg-blue-200/40 rounded-full">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

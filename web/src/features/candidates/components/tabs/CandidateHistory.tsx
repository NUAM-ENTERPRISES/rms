import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { History } from "lucide-react";
import { StatusHistoryTable } from "../StatusHistoryTable";

interface CandidateHistoryProps {
  candidateId: string;
}

export const CandidateHistory: React.FC<CandidateHistoryProps> = ({ candidateId }) => {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl transition-shadow duration-300 hover:shadow-2xl">
        <CardHeader className="border-b border-slate-100 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
                <div className="p-2 bg-amber-100 rounded-xl shadow-inner">
                  <History className="h-6 w-6 text-amber-600" />
                </div>
                Status History
              </CardTitle>
              <CardDescription className="mt-2 text-slate-600 font-medium max-w-xl">
                Complete timeline of all status changes and activities for this candidate
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8 pb-6">
          <StatusHistoryTable candidateId={candidateId} />
        </CardContent>
      </Card>
    </div>
  );
};

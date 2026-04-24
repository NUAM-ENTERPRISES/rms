import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import InterviewHistory from "@/components/molecules/InterviewHistory";

interface ScreeningInterviewHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  historyData: any;
  isLoading: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
}

export function ScreeningInterviewHistoryModal({
  isOpen,
  onOpenChange,
  candidateName,
  historyData,
  isLoading,
  page = 1,
  onPageChange,
}: ScreeningInterviewHistoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-6xl h-[80vh] overflow-hidden flex flex-col p-6 gap-6 rounded-2xl">
        <DialogHeader className="px-0 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" /> Interview History
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Timeline of all interview attempts for {candidateName}
          </p>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="pb-4">
              <InterviewHistory 
                items={historyData?.data?.items} 
                isLoading={isLoading} 
                pagination={historyData?.data?.pagination}
                onPageChange={onPageChange}
              />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

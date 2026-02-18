import { useState, useEffect, useMemo } from "react";
import { Loader2, Calendar, Video, Clock, Users, CheckCircle2, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/molecules";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SelectedCandidate {
  id: string;
  candidate?: {
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
  roleNeeded?: {
    designation?: string;
  };
  project?: {
    title?: string;
  };
}

export interface InterviewSchedule {
  candidateProjectMapId: string;
  scheduledTime: Date;
  duration: number;
  type: string;
  mode: "video" | "phone" | "in-person";
  meetingLink?: string;
  notes?: string;
}

interface BulkScheduleInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCandidates: SelectedCandidate[];
  onSubmit: (schedules: InterviewSchedule[]) => Promise<void>;
  isSubmitting?: boolean;
}

export function BulkScheduleInterviewModal({
  open,
  onOpenChange,
  selectedCandidates,
  onSubmit,
  isSubmitting = false,
}: BulkScheduleInterviewModalProps) {
  const [scheduleMode, setScheduleMode] = useState<"same" | "custom">("same");
  
  // Single schedule state for "Same for all"
  const [commonSchedule, setCommonSchedule] = useState<Partial<InterviewSchedule>>({
    scheduledTime: undefined,
    duration: 60,
    type: "technical",
    mode: "video",
    meetingLink: "",
    notes: "",
  });

  // Individual schedules state for "Custom for each"
  const [individualSchedules, setIndividualSchedules] = useState<Record<string, Partial<InterviewSchedule>>>({});

  useEffect(() => {
    if (open) {
      const initial: Record<string, Partial<InterviewSchedule>> = {};
      selectedCandidates.forEach((c) => {
        initial[c.id] = {
          scheduledTime: undefined,
          duration: 60,
          type: "technical",
          mode: "video",
          meetingLink: "",
          notes: "",
        };
      });
      setIndividualSchedules(initial);
      setScheduleMode("same");
    }
  }, [open, selectedCandidates]);

  const updateCommonSchedule = <K extends keyof InterviewSchedule>(field: K, value: InterviewSchedule[K] | undefined) => {
    setCommonSchedule(prev => ({ ...prev, [field]: value }));
  };

  const updateIndividualSchedule = <K extends keyof InterviewSchedule>(id: string, field: K, value: InterviewSchedule[K] | undefined) => {
    setIndividualSchedules(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const applyCommonToIndividual = () => {
    const updated: Record<string, Partial<InterviewSchedule>> = {};
    selectedCandidates.forEach(c => {
      updated[c.id] = { ...commonSchedule };
    });
    setIndividualSchedules(updated);
    setScheduleMode("custom");
  };

  const handleSubmit = async () => {
    let finalSchedules: InterviewSchedule[] = [];

    if (scheduleMode === "same") {
      if (!commonSchedule.scheduledTime) return;
      finalSchedules = selectedCandidates.map(c => ({
        ...commonSchedule,
        candidateProjectMapId: c.id,
      } as InterviewSchedule));
    } else {
      const missingDates = selectedCandidates.some(c => !individualSchedules[c.id]?.scheduledTime);
      if (missingDates) return;
      
      finalSchedules = selectedCandidates.map(c => ({
        ...individualSchedules[c.id],
        candidateProjectMapId: c.id,
      } as InterviewSchedule));
    }

    await onSubmit(finalSchedules);
  };

  const isFormValid = useMemo(() => {
    if (scheduleMode === "same") {
      return !!commonSchedule.scheduledTime;
    }
    return selectedCandidates.every(c => !!individualSchedules[c.id]?.scheduledTime);
  }, [scheduleMode, commonSchedule.scheduledTime, individualSchedules, selectedCandidates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-6 w-6 text-teal-600" />
            Bulk Schedule Interview
          </DialogTitle>
          <DialogDescription>
            Schedule interviews for {selectedCandidates.length} candidate(s).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 space-y-6">
          {/* Mode Selector */}
          <div className="flex p-1 bg-slate-100 rounded-lg w-fit shrink-0">
            <button
              onClick={() => setScheduleMode("same")}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                scheduleMode === "same" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Same for all
            </button>
            <button
              onClick={() => setScheduleMode("custom")}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                scheduleMode === "custom" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Individual schedules
            </button>
          </div>

          <ScrollArea className="flex-1 pr-4">
            {scheduleMode === "same" ? (
              <div className="space-y-6 max-w-2xl mx-auto py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date & Time</Label>
                    <DatePicker
                      value={commonSchedule.scheduledTime}
                      onChange={(date) => updateCommonSchedule("scheduledTime", date)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Interview Type</Label>
                    <Select 
                      value={commonSchedule.type || "technical"} 
                      onValueChange={(val) => updateCommonSchedule("type", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="managerial">Managerial</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <Select 
                      value={commonSchedule.mode || "video"} 
                      onValueChange={(val) => updateCommonSchedule("mode", val as InterviewSchedule["mode"])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video Call</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="in-person">In-Person</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (mins)</Label>
                    <Input 
                      type="number"
                      value={commonSchedule.duration}
                      onChange={(e) => updateCommonSchedule("duration", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                {commonSchedule.mode === "video" && (
                  <div className="space-y-2">
                    <Label>Meeting Link</Label>
                    <Input 
                      placeholder="https://zoom.us/j/..."
                      value={commonSchedule.meetingLink}
                      onChange={(e) => updateCommonSchedule("meetingLink", e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes for Candidates</Label>
                  <Textarea 
                    placeholder="Preparation tips, requirements, etc."
                    value={commonSchedule.notes}
                    onChange={(e) => updateCommonSchedule("notes", e.target.value)}
                  />
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-teal-700 border-teal-200"
                  onClick={applyCommonToIndividual}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Use this as baseline for individual edits
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {selectedCandidates.map((c) => {
                  const schedule = individualSchedules[c.id] || {};
                  return (
                    <div key={c.id} className="p-4 rounded-xl border bg-white shadow-sm space-y-4">
                      <div className="flex items-center gap-3 border-b pb-3">
                        <ImageViewer
                          src={c.candidate?.profileImage}
                          title={c.candidate ? `${c.candidate.firstName} ${c.candidate.lastName}` : "Unknown"}
                          className="h-10 w-10 shrink-0 rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">
                            {c.candidate ? `${c.candidate.firstName} ${c.candidate.lastName}` : "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.roleNeeded?.designation} • {c.project?.title}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-muted-foreground">Date & Time</Label>
                          <DatePicker
                            value={schedule.scheduledTime}
                            onChange={(date) => updateIndividualSchedule(c.id, "scheduledTime", date)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
                          <Select 
                            value={schedule.type || "technical"} 
                            onValueChange={(val) => updateIndividualSchedule(c.id, "type", val)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="technical">Technical</SelectItem>
                              <SelectItem value="hr">HR</SelectItem>
                              <SelectItem value="managerial">Managerial</SelectItem>
                              <SelectItem value="final">Final</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-muted-foreground">Mode</Label>
                          <Select 
                            value={schedule.mode || "video"} 
                            onValueChange={(val) => updateIndividualSchedule(c.id, "mode", val as InterviewSchedule["mode"])}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="in-person">In-Person</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {schedule.mode === "video" && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-muted-foreground">Meeting Link</Label>
                          <Input 
                            className="h-8 text-xs"
                            placeholder="Link for this candidate..."
                            value={schedule.meetingLink}
                            onChange={(e) => updateIndividualSchedule(c.id, "meetingLink", e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="p-6 pt-2 border-t bg-slate-50/50 gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="bg-teal-600 hover:bg-teal-700 min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Scheduling...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Schedule {selectedCandidates.length} Interviews
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

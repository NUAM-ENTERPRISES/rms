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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/molecules";
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
  mode: "video" | "phone" | "in-person";
  meetingLink?: string;
  location?: string;
  notes?: string;
  airTicket?: "up-and-down" | "up-only" | "down-only";
  accommodation?: boolean;
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
    mode: "video",
    meetingLink: "",
    location: "",
    notes: "",
    airTicket: undefined,
    accommodation: false,
  });

  // Individual schedules state for "Custom for each"
  const [individualSchedules, setIndividualSchedules] = useState<Record<string, Partial<InterviewSchedule>>>({});

  useEffect(() => {
    if (open) {
      const initial: Record<string, Partial<InterviewSchedule>> = {};
      selectedCandidates.forEach((c) => {
        initial[c.id] = {
          scheduledTime: undefined,
          mode: "video",
          meetingLink: "",
          location: "",
          notes: "",
          airTicket: undefined,
          accommodation: false,
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
      if (commonSchedule.mode === "in-person" && !commonSchedule.location?.trim()) return;

      const airTicketUp = commonSchedule.airTicket === 'up-only' || commonSchedule.airTicket === 'up-and-down';
      const airTicketDown = commonSchedule.airTicket === 'down-only' || commonSchedule.airTicket === 'up-and-down';

      finalSchedules = selectedCandidates.map(c => ({
        ...commonSchedule,
        candidateProjectMapId: c.id,
        airTicket: commonSchedule.airTicket,
        airTicketUp,
        airTicketDown,
        accommodation: commonSchedule.accommodation ?? false,
      } as InterviewSchedule));
    } else {
      const missingDates = selectedCandidates.some(c => !individualSchedules[c.id]?.scheduledTime);
      if (missingDates) return;

      const missingLocations = selectedCandidates.some(c => {
        const schedule = individualSchedules[c.id];
        return schedule?.mode === "in-person" && !schedule.location?.trim();
      });
      if (missingLocations) return;

      finalSchedules = selectedCandidates.map(c => {
        const schedule = individualSchedules[c.id] || {};
        const airTicketUp = schedule.airTicket === 'up-only' || schedule.airTicket === 'up-and-down';
        const airTicketDown = schedule.airTicket === 'down-only' || schedule.airTicket === 'up-and-down';
        return {
          ...schedule,
          candidateProjectMapId: c.id,
          airTicket: schedule.airTicket,
          airTicketUp,
          airTicketDown,
          accommodation: schedule.accommodation ?? false,
        } as InterviewSchedule;
      });
    }

    await onSubmit(finalSchedules);
  };

  const isFormValid = useMemo(() => {
    if (scheduleMode === "same") {
      const hasTime = !!commonSchedule.scheduledTime;
      const hasLocation = commonSchedule.mode === "in-person" ? !!commonSchedule.location?.trim() : true;
      return hasTime && hasLocation;
    }

    return selectedCandidates.every(c => {
      const schedule = individualSchedules[c.id];
      if (!schedule?.scheduledTime) return false;
      if (schedule.mode === "in-person" && !schedule.location?.trim()) return false;
      return true;
    });
  }, [scheduleMode, commonSchedule.scheduledTime, commonSchedule.mode, commonSchedule.location, individualSchedules, selectedCandidates]);

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

                {commonSchedule.mode === "in-person" && (
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input 
                      placeholder="Location"
                      value={commonSchedule.location}
                      onChange={(e) => updateCommonSchedule("location", e.target.value)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Air Ticket</Label>
                    <Select
                      value={commonSchedule.airTicket}
                      onValueChange={(val) => updateCommonSchedule("airTicket", val as InterviewSchedule["airTicket"])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select air ticket" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="up-and-down">Up and Down</SelectItem>
                        <SelectItem value="up-only">Up Only</SelectItem>
                        <SelectItem value="down-only">Down Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={commonSchedule.accommodation || false}
                      onCheckedChange={(checked) => updateCommonSchedule("accommodation", Boolean(checked))}
                    />
                    <Label className="m-0">Accommodation required</Label>
                  </div>
                </div>

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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-muted-foreground">Date & Time</Label>
                          <DatePicker
                            value={schedule.scheduledTime}
                            onChange={(date) => updateIndividualSchedule(c.id, "scheduledTime", date)}
                            className="h-9"
                          />
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Air Ticket</Label>
                          <Select
                            value={schedule.airTicket || "up-and-down"}
                            onValueChange={(val) => updateIndividualSchedule(c.id, "airTicket", val as InterviewSchedule["airTicket"])}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Air ticket" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="up-and-down">Up and Down</SelectItem>
                              <SelectItem value="up-only">Up Only</SelectItem>
                              <SelectItem value="down-only">Down Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2" style={{ marginTop: '20px' }}>
                          <Checkbox
                            checked={Boolean(schedule.accommodation)}
                            onCheckedChange={(checked) => updateIndividualSchedule(c.id, "accommodation", Boolean(checked))}
                          />
                          <Label className="m-0 text-xs">Accommodation required</Label>
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

                      {schedule.mode === "in-person" && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-muted-foreground">Location</Label>
                          <Input
                            className="h-8 text-xs"
                            placeholder="In-person location for this candidate"
                            value={schedule.location}
                            onChange={(e) => updateIndividualSchedule(c.id, "location", e.target.value)}
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

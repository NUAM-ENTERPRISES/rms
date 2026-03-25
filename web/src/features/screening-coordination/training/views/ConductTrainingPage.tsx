import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  ChevronLeft,
  CheckCircle2,
  Clock,
  MessageSquare,
  Star,
  Save,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useBulkCompleteSessionsMutation } from "../data/training.endpoints";
import { TrainingAssignment } from "../../types";

interface ConductTrainingState {
  assignments: TrainingAssignment[];
}

export default function ConductTrainingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ConductTrainingState;
  const assignments = state?.assignments || [];

  const [bulkCompleteSessions, { isLoading: isSubmitting }] = useBulkCompleteSessionsMutation();

  // Initialize form data for each candidate
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    assignments.forEach((a) => {
      // Find the latest pending session or use a placeholder
      const session = a.sessions?.[0] || { id: `new-${a.id}` };
      initial[a.id] = {
        sessionId: session.id,
        rating: "", // Changed from 0 to empty string for validation
        remarks: "",
      };
    });
    return initial;
  });

  const handleInputChange = (id: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const isFormInvalid = Object.values(formData).some(
    (data) => data.rating === "" || data.rating === undefined || data.rating === null || data.rating < 0 || data.rating > 100
  );

  const handleSubmit = async () => {
    if (isFormInvalid) {
      toast.error("Please provide a performance rating between 0 and 100 for all candidates");
      return;
    }

    try {
      const payload = Object.entries(formData).map(([_, data]) => ({
        sessionId: data.sessionId,
        performanceRating: Number(data.rating),
        sessionNotes: data.remarks || undefined,
      }));

      await bulkCompleteSessions({ sessions: payload }).unwrap();
      
      toast.success("Training records updated successfully");
      navigate(-1);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update training records");
    }
  };

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Users className="w-12 h-12 mb-4 opacity-20" />
        <p>No candidates selected for training.</p>
        <Button variant="link" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            Conduct Training Session
          </h1>
        </div>
        {assignments.length > 1 && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
            <div className="text-sm font-medium text-slate-600">Bulk Apply:</div>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="Rating"
              className="w-24 h-9"
              id="bulk-rating"
            />
            <Input
              placeholder="Common Remarks"
              className="w-64 h-9"
              id="bulk-remarks"
            />
            <Button
              variant="outline"
              size="sm"
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={() => {
                const r = (document.getElementById("bulk-rating") as HTMLInputElement).value;
                const m = (document.getElementById("bulk-remarks") as HTMLInputElement).value;
                const updated = { ...formData };
                assignments.forEach((a) => {
                  updated[a.id] = {
                    ...updated[a.id],
                    ...(r ? { rating: r } : {}),
                    ...(m ? { remarks: m } : {}),
                  };
                });
                setFormData(updated);
                toast.success("Applied to all candidates");
              }}
            >
              Apply to All
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {assignments.map((assignment) => {
          const candidate = assignment.candidateProjectMap?.candidate;
          const project = assignment.candidateProjectMap?.project;
          const data = formData[assignment.id];

          return (
            <Card key={assignment.id} className="overflow-hidden border-indigo-100 shadow-sm transition-all hover:shadow-md">
              <CardHeader className="bg-slate-50/50 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                      {candidate?.firstName?.[0]}{candidate?.lastName?.[0]}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {candidate?.firstName} {candidate?.lastName}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {project?.title} • {assignment.candidateProjectMap?.roleNeeded?.designation || "Training Candidate"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                    {assignment.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rating & Performance */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5" /> Performance Rating (0-100) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Enter score (0-100)"
                        value={data.rating}
                        onChange={(e) => handleInputChange(assignment.id, "rating", e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Training Remarks & Observations (Optional)
                    </label>
                    <Textarea
                      placeholder="Enter detailed observations about the candidate's performance during this session..."
                      value={data.remarks}
                      onChange={(e) => handleInputChange(assignment.id, "remarks", e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isFormInvalid}
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 px-8 shadow-xl shadow-indigo-100 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Complete Training Session
                </Button>
              </div>
            </TooltipTrigger>
            {isFormInvalid && (
              <TooltipContent className="bg-red-50 text-red-600 border-red-100">
                <p>Please fill performance rating (0-100) for all candidates</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

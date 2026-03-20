import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useGetCandidateProjectsWorkflowDetailsQuery } from "../api";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  FileText, 
  Users, 
  Activity, 
  ClipboardCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Building2,
  Calendar,
  User,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import LoadingScreen from "@/components/atoms/LoadingScreen";

export default function CandidateProjectWorkflowPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [searchParams] = useSearchParams();
  const activeType = searchParams.get("type") || "documentation";
  const navigate = useNavigate();

  const { data: candidate, isLoading, error } = useGetCandidateProjectsWorkflowDetailsQuery(candidateId!);

  if (isLoading) return <LoadingScreen />;
  if (error || !candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">Error loading candidate details</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const projects = candidate.projects || [];

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {candidate.firstName} {candidate.lastName} - Workflow Details
            </h1>
            <p className="text-gray-500">
              Viewing all nominated projects and their workflow status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="px-3 py-1 uppercase font-bold text-xs bg-blue-50 text-blue-700 border-blue-200">
            {projects.length} Project{(projects.length !== 1) ? "s" : ""}
          </Badge>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-12 text-center">
          <Building2 className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium text-lg">No nominated projects found for this candidate.</p>
          <Button onClick={() => navigate(-1)} variant="link" className="mt-2">Return to Overview</Button>
        </Card>
      ) : (
        <Tabs defaultValue={`project-${projects[0].id}`} className="w-full">
          <TabsList className="bg-slate-100/50 p-1 h-auto flex-wrap mb-6">
            {projects.map((p: any) => (
              <TabsTrigger 
                key={p.id} 
                value={`project-${p.id}`}
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-xs font-semibold"
              >
                {p.project?.title || "Unnamed Project"}
              </TabsTrigger>
            ))}
          </TabsList>

          {projects.map((p: any) => (
            <TabsContent key={p.id} value={`project-${p.id}`} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Project Overview Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 uppercase flex items-center gap-2">
                            <Building2 className="h-4 w-4" /> Client & Project
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-bold text-slate-900">{p.project?.client?.name || "N/A"}</p>
                        <p className="text-sm text-slate-600 mb-2">{p.project?.title}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="h-3.5 w-3.5" />
                            Nominated on {format(new Date(p.createdAt), "dd MMM yyyy")}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 uppercase flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Current Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-blue-600 text-white font-bold px-3 py-1">
                                    {p.mainStatus?.name?.toUpperCase() || "N/A"}
                                </Badge>
                                <ArrowLeft className="h-3 w-3 text-slate-400 rotate-180" />
                                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 font-bold px-3 py-1">
                                    {p.subStatus?.label || p.subStatus?.name || "N/A"}
                                </Badge>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 italic">
                                * Last system update recorded in history
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 uppercase flex items-center gap-2">
                            <User className="h-4 w-4" /> Recruitment Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium text-slate-900">Assigned Recruiter ID: {p.recruiterId || "N/A"}</p>
                        <button 
                            onClick={() => navigate(`/projects/${p.projectId}`)}
                            className="mt-2 text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                        >
                            <ExternalLink className="h-3 w-3" /> View Project Details
                        </button>
                    </CardContent>
                </Card>
              </div>

              {/* Workflow Details Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Documentation Section */}
                <Card className="shadow-sm border-slate-200 overflow-hidden">
                  <div className="bg-purple-600 px-4 py-3 flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Documentation & Verification
                    </h3>
                    <Badge variant="secondary" className="bg-purple-700 text-white border-0 hover:bg-purple-800">
                        {p.documentVerifications?.length || 0} Files
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    {p.documentVerifications?.length > 0 ? (
                      <div className="space-y-3">
                        {p.documentVerifications.map((dv: any) => (
                          <div key={dv.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/30">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-900">{dv.requirement?.name || "Document"}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 ${
                                  dv.status === 'verified' ? 'bg-green-50 text-green-700 border-green-200' : 
                                  dv.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {dv.status?.toUpperCase() || 'PENDING'}
                                </Badge>
                                {dv.document && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                    Uploaded: {format(new Date(dv.document.createdAt), "dd/MM/yy")}
                                  </span>
                                )}
                              </div>
                            </div>
                            {dv.rejectionReason && (
                                <p className="text-[10px] text-red-500 italic mt-1 truncate max-w-[200px]">Reason: {dv.rejectionReason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-slate-50/50 rounded-lg border border-dashed text-slate-400 text-xs">
                        No document verification records found for this project.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Interviews & Screenings */}
                <Card className="shadow-sm border-slate-200 overflow-hidden">
                  <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <Users className="h-4 w-4" /> Interviews & Screenings
                    </h3>
                    <div className="flex gap-2">
                         <Badge variant="secondary" className="bg-emerald-700 text-white border-0">
                            {p.interviews?.length || 0} Int
                        </Badge>
                        <Badge variant="secondary" className="bg-emerald-700 text-white border-0">
                            {p.screenings?.length || 0} Scrn
                        </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <Tabs defaultValue="interviews" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4 h-8 bg-slate-100">
                            <TabsTrigger value="interviews" className="text-[10px] font-bold">Client Interviews</TabsTrigger>
                            <TabsTrigger value="screenings" className="text-[10px] font-bold">Screening Tests</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="interviews" className="space-y-3">
                            {p.interviews?.length > 0 ? (
                                p.interviews.map((int: any) => (
                                    <div key={int.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/30">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 capitalize">{int.type} Interview</p>
                                                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                                    <Calendar className="h-3 w-3" /> {format(new Date(int.scheduledAt), "dd MMM yyyy, HH:mm")}
                                                </p>
                                            </div>
                                            <Badge className={`text-[9px] font-bold ${
                                                int.status === 'passed' ? 'bg-green-600' :
                                                int.status === 'failed' ? 'bg-red-600' : 'bg-amber-600'
                                            }`}>
                                                {int.status?.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center bg-slate-50/50 rounded-lg border border-dashed text-slate-400 text-xs">
                                    No client interview records found.
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="screenings" className="space-y-3">
                             {p.screenings?.length > 0 ? (
                                p.screenings.map((scr: any) => (
                                    <div key={scr.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/30">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{scr.template?.name || "Internal Screening"}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                     <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <Activity className="h-3 w-3" /> Score: <span className="font-bold text-slate-700">{scr.score || 'N/A'}</span>
                                                    </p>
                                                    <span className="text-slate-300">|</span>
                                                    <p className="text-[10px] text-slate-500">
                                                        {format(new Date(scr.scheduledAt), "dd MMM yyyy")}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={`text-[9px] font-bold ${
                                                scr.recommendation === 'QUALIFIED' ? 'border-green-300 text-green-700 bg-green-50' : 
                                                'border-red-300 text-red-700 bg-red-50'
                                            }`}>
                                                {scr.recommendation || 'PENDING'}
                                            </Badge>
                                        </div>
                                        {scr.checklistItems?.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-100">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Checklist Preview</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {scr.checklistItems.slice(0, 3).map((item: any) => (
                                                        <Badge key={item.id} variant="secondary" className="text-[8px] bg-slate-100 text-slate-600 border-0 h-4">
                                                            {item.templateItem?.question?.substring(0, 15)}...
                                                        </Badge>
                                                    ))}
                                                    {scr.checklistItems.length > 3 && <span className="text-[8px] text-slate-400">+{scr.checklistItems.length - 3} more</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center bg-slate-50/50 rounded-lg border border-dashed text-slate-400 text-xs">
                                    No screening records found.
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* 3. Processing Details Section */}
                <Card className="shadow-sm border-slate-200 overflow-hidden lg:col-span-2">
                  <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Processing Steps & History
                    </h3>
                  </div>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-12 min-h-[300px]">
                        {/* Steps Timeline */}
                        <div className="md:col-span-12 p-6 border-b border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <ClipboardCheck className="h-3.5 w-3.5" /> Progress Roadmap
                            </h4>
                            {p.processing?.processingSteps?.length > 0 ? (
                                <div className="flex items-center w-full overflow-x-auto pb-4 scrollbar-hide">
                                    {p.processing.processingSteps.map((step: any, index: number) => {
                                        const isCompleted = step.status === 'completed';
                                        const isInProgress = step.status === 'in_progress';
                                        const isLast = index === p.processing.processingSteps.length - 1;
                                        
                                        return (
                                            <div key={step.id} className="flex items-center min-w-[140px] flex-shrink-0">
                                                <div className="flex flex-col items-center gap-2 relative">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 ${
                                                        isCompleted ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-200' :
                                                        isInProgress ? 'bg-blue-50 border-blue-600 text-blue-600 animate-pulse' :
                                                        'bg-white border-slate-200 text-slate-300'
                                                    }`}>
                                                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                                                    </div>
                                                    <div className="text-center w-24">
                                                        <p className={`text-[10px] font-bold truncate ${isCompleted ? 'text-slate-900' : isInProgress ? 'text-blue-600' : 'text-slate-400'}`}>
                                                            {step.template?.name || "Step"}
                                                        </p>
                                                        {step.completedAt && (
                                                            <p className="text-[8px] text-slate-400 leading-tight">
                                                                {format(new Date(step.completedAt), "dd/MM/yy")}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {!isLast && (
                                                    <div className={`h-0.5 w-full -mt-7 -ml-2 min-w-[40px] ${isCompleted ? 'bg-green-500' : 'bg-slate-100'}`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-6 text-center text-slate-400 text-xs italic">
                                    No processing roadmap has been initialized for this project.
                                </div>
                            )}
                        </div>

                        {/* Audit / History */}
                        <div className="md:col-span-12 p-6 bg-slate-50/30">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" /> Recent Processing Activity
                            </h4>
                            {p.processing?.history?.length > 0 ? (
                                <div className="space-y-4">
                                    {p.processing.history.slice(0, 5).map((log: any) => (
                                        <div key={log.id} className="flex items-start gap-4">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-4">
                                                    <p className="text-xs text-slate-700 leading-normal">
                                                        <span className="font-bold text-slate-900">{log.user?.name}</span> {log.description}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap pt-0.5">
                                                        {format(new Date(log.createdAt), "dd MMM, HH:mm")}
                                                    </span>
                                                </div>
                                                {log.notes && (
                                                    <div className="mt-1 p-2 bg-white rounded border border-slate-100 inline-block max-w-full">
                                                        <p className="text-[10px] text-slate-600 italic break-words">"{log.notes}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {p.processing.history.length > 5 && (
                                        <button className="text-[10px] font-bold text-blue-600 hover:underline">View all history</button>
                                    )}
                                </div>
                            ) : (
                                <div className="py-4 text-slate-400 text-xs italic">
                                    No activity logs found.
                                </div>
                            )}
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

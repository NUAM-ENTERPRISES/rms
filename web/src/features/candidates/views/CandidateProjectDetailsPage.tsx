import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText,
    User,
    Building,
    MapPin,
    Calendar,
    Mail,
    Phone,
    Users,
    Upload,
    Search,
    ShieldCheck,
    ThumbsUp,
    MessageCircle,
    Award,
    ClipboardList,
    Luggage,
    XCircle,
    PauseCircle
} from "lucide-react";
import { JSX, useEffect } from "react";

import { useGetCandidateProjectPipelineQuery } from "@/features/candidates/api";

export default function CandidateProjectDetailsPage() {

    const { candidateId, projectId } = useParams() as { candidateId: string; projectId: string };

    const navigate = useNavigate();


  // Add null checks before using the hook
  const { data: pipelineResponse, error, isLoading } = useGetCandidateProjectPipelineQuery(
    candidateId && projectId 
      ? { candidateId, projectId }
      : { candidateId: '', projectId: '' }, // Fallback empty strings
    { skip: !candidateId || !projectId } // Skip query if params are missing
  );


    // Mock data
    const candidateData = {
        name: "Dr. Priya Sharma",
        email: "priya.sharma@email.com",
        phone: "+91 98765 43210",
        location: "New Delhi, India",
        qualification: "MBBS, MD Medicine"
    };

    const projectData = {
        title: "Medical Residency Program",
        university: "University of Toronto",
        country: "Canada",
        duration: "3 Years"
    };

    // Status icons mapping
    const getStatusIcon = (statusName: string) => {
        const icons: Record<string, JSX.Element> = {
            nominated: <Users className="h-4 w-4" />,
            pending_documents: <Upload className="h-4 w-4" />,
            documents_submitted: <FileText className="h-4 w-4" />,
            verification_in_progress: <Search className="h-4 w-4" />,
            documents_verified: <ShieldCheck className="h-4 w-4" />,
            approved: <ThumbsUp className="h-4 w-4" />,
            interview_scheduled: <Calendar className="h-4 w-4" />,
            interview_completed: <MessageCircle className="h-4 w-4" />,
            interview_passed: <Award className="h-4 w-4" />,
            selected: <CheckCircle2 className="h-4 w-4" />,
            processing: <ClipboardList className="h-4 w-4" />,
            hired: <Luggage className="h-4 w-4" />,
            rejected_documents: <XCircle className="h-4 w-4" />,
            rejected_interview: <XCircle className="h-4 w-4" />,
            rejected_selection: <XCircle className="h-4 w-4" />,
            withdrawn: <PauseCircle className="h-4 w-4" />,
            on_hold: <Clock className="h-4 w-4" />
        };
        return icons[statusName] || <FileText className="h-4 w-4" />;
    };

  

   

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="rounded-lg w-9 h-9 p-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Candidate Project Details</h1>
                            <p className="text-gray-600 text-sm">Tracking candidate project details progress</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Pipeline Section */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Progress Summary */}
                        <Card className="shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Application Progress</h3>
                                        <p className="text-gray-600 text-sm">6 of 10 steps completed</p>
                                    </div>
                                    <Badge className="bg-blue-100 text-blue-800">
                                        60% Complete
                                    </Badge>
                                </div>
                                <Progress value={60} className="h-2" />
                            </CardContent>
                        </Card>

                     

                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Candidate Info */}
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-blue-600" />
                                    Candidate
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm mx-auto mb-2">
                                        {candidateData.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <h3 className="font-semibold text-gray-900">{pipelineResponse?.data?.candidate?.firstName}</h3>
                                    <p className="text-gray-600 text-sm">{candidateData.qualification}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">{pipelineResponse?.data?.candidate?.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">{pipelineResponse?.data?.candidate?.mobileNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">{candidateData.location}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Project Info */}
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building className="h-5 w-5 text-green-600" />
                                    Project
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{projectData.title}</h3>
                                    <p className="text-gray-600 text-sm">{projectData.university}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500">Country</label>
                                        <p className="text-sm font-medium">{projectData.country}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Duration</label>
                                        <p className="text-sm font-medium">{projectData.duration}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Button className="w-full justify-start gap-2" size="sm">
                                        <Mail className="h-4 w-4" />
                                        Send Update
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                                        <MessageCircle className="h-4 w-4" />
                                        Contact
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    
                </div>
            </div>
        </div>
    );
}
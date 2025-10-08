import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  DollarSign,
  Building2,
  GraduationCap,
  Star,
  MapPin,
  CheckCircle,
  X,
} from "lucide-react";

interface CandidatePreviewProps {
  candidateData: {
    firstName: string;
    lastName: string;
    countryCode: string;
    phone: string;
    email?: string;
    source: string;
    dateOfBirth: string;
    totalExperience?: number;
    currentSalary?: number;
    currentEmployer?: string;
    currentRole?: string;
    expectedSalary?: number;
    highestEducation?: string;
    university?: string;
    graduationYear?: number;
    gpa?: number;
    skills: string[];
    workExperiences: any[];
  };
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CandidatePreview({
  candidateData,
  onConfirm,
  onCancel,
  isLoading = false,
}: CandidatePreviewProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatSalary = (salary?: number) => {
    if (!salary) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(salary);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            Candidate Preview
          </h1>
          <p className="text-slate-600 mt-2">
            Review all the details before creating the candidate
          </p>
        </div>

        {/* Personal Information */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
              <User className="h-5 w-5 text-blue-600" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Full Name
                </label>
                <p className="text-lg font-semibold text-slate-800">
                  {candidateData.firstName} {candidateData.lastName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Contact
                </label>
                <p className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {candidateData.countryCode}
                  {candidateData.phone}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Email
                </label>
                <p className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {candidateData.email || "Not provided"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Date of Birth
                </label>
                <p className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(candidateData.dateOfBirth)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Source
                </label>
                <Badge variant="outline" className="mt-1">
                  {candidateData.source}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Details */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Professional Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Total Experience
                </label>
                <p className="text-lg font-semibold text-slate-800">
                  {candidateData.totalExperience
                    ? `${candidateData.totalExperience} years`
                    : "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Current Role
                </label>
                <p className="text-lg font-semibold text-slate-800">
                  {candidateData.currentRole || "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Current Employer
                </label>
                <p className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {candidateData.currentEmployer || "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Current Salary
                </label>
                <p className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {formatSalary(candidateData.currentSalary)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Expected Salary
                </label>
                <p className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {formatSalary(candidateData.expectedSalary)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Educational Qualifications */}
        {(candidateData.highestEducation ||
          candidateData.university ||
          candidateData.graduationYear ||
          candidateData.gpa) && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                Educational Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {candidateData.highestEducation && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Highest Education
                    </label>
                    <p className="text-lg font-semibold text-slate-800">
                      {candidateData.highestEducation}
                    </p>
                  </div>
                )}
                {candidateData.university && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      University
                    </label>
                    <p className="text-lg font-semibold text-slate-800">
                      {candidateData.university}
                    </p>
                  </div>
                )}
                {candidateData.graduationYear && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Graduation Year
                    </label>
                    <p className="text-lg font-semibold text-slate-800">
                      {candidateData.graduationYear}
                    </p>
                  </div>
                )}
                {candidateData.gpa && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      GPA
                    </label>
                    <p className="text-lg font-semibold text-slate-800">
                      {candidateData.gpa}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skills */}
        {candidateData.skills.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
                <Star className="h-5 w-5 text-blue-600" />
                Skills & Expertise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {candidateData.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Work Experience */}
        {candidateData.workExperiences.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Work Experience ({candidateData.workExperiences.length} entries)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidateData.workExperiences.map((experience, index) => (
                <div
                  key={experience.id || index}
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 text-lg">
                        {experience.jobTitle}
                      </h4>
                      <p className="text-slate-600 font-medium">
                        {experience.companyName}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {formatDate(experience.startDate)} -{" "}
                        {experience.isCurrent
                          ? "Present"
                          : formatDate(experience.endDate)}
                      </p>
                      {experience.location && (
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {experience.location}
                        </p>
                      )}
                      {experience.salary && (
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <DollarSign className="h-3 w-3" />
                          {formatSalary(experience.salary)}
                        </p>
                      )}
                      {experience.description && (
                        <p className="text-sm text-slate-600 mt-2">
                          {experience.description}
                        </p>
                      )}
                      {experience.skills && experience.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {experience.skills.map(
                            (skill: string, skillIndex: number) => (
                              <Badge
                                key={skillIndex}
                                variant="outline"
                                className="text-xs"
                              >
                                {skill}
                              </Badge>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            <X className="h-4 w-4 mr-2" />
            Back to Edit
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-w-[120px] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Candidate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

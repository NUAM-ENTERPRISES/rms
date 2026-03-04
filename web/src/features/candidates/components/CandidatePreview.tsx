import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  GraduationCap,
  MapPin,
  CheckCircle,
  X,
  Edit2,
} from "lucide-react";

interface CandidatePreviewProps {
  candidateData: {
    firstName: string;
    lastName: string;
    contact: string;
    email?: string;
    source: string;
    gender: string;
    dateOfBirth: string;
    referralCompanyName?: string;
    referralEmail?: string;
    referralCountryCode?: string;
    referralPhone?: string;
    referralDescription?: string;
    highestEducation?: string;
    university?: string;
    graduationYear?: number;
    gpa?: number;
    qualifications?: any[];
    workExperiences?: any[];
    expectedMinSalary?: number;
    expectedMaxSalary?: number;
    preferredCountries?: string[];
    facilityPreferences?: string[];
    sectorType?: string;
    visaType?: string;
    skinTone?: string;
    smartness?: string;
    licensingExam?: string;
    height?: number;
    weight?: number;
    languageProficiency?: string;
    dataFlow?: boolean;
    eligibility?: boolean;
  };
  onConfirm: () => void;
  onCancel: () => void;
  onEditStep?: (step: number) => void;
  isLoading?: boolean;
}

export default function CandidatePreview({
  candidateData,
  onConfirm,
  onCancel,
  onEditStep,
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

  return (
  <Dialog open={true} onOpenChange={onCancel}>
    <DialogContent className="!w-5xl !h-[95vh] sm:!max-w-[98vw] bg-white dark:bg-black rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <DialogHeader className="px-6 pt-6">
        <DialogTitle className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-3 select-none">
          <CheckCircle className="h-6 w-6 text-green-600" />
          Candidate Preview
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-slate-600 dark:text-slate-300 font-medium">
          Review all the details before creating the candidate
        </DialogDescription>
      </DialogHeader>

     <div className="space-y-8 overflow-y-auto max-h-[calc(95vh-130px)] px-6 pb-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
  {/* Personal Information */}
  <Card className="border border-slate-300 dark:border-slate-700 rounded-md shadow-sm bg-white dark:bg-black overflow-hidden">
    <CardHeader className="p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100 border-0 p-0">
          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Personal Information
        </CardTitle>
        {onEditStep && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            onClick={() => onEditStep(1)}
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Edit</span>
          </Button>
        )}
      </div>
    </CardHeader>
    <CardContent className="space-y-4 p-4 bg-white dark:bg-black">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Full Name
          </label>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {candidateData.firstName} {candidateData.lastName}
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Contact
          </label>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {candidateData.contact}
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Email
          </label>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {candidateData.email || "Not provided"}
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Date of Birth
          </label>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {formatDate(candidateData.dateOfBirth)}
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Source
          </label>
          <Badge variant="outline" className="mt-1 text-xs text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-900">
            {candidateData.source}
          </Badge>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Gender
          </label>
          <Badge variant="outline" className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-500 lowercase capitalize bg-white dark:bg-slate-900">
            {candidateData.gender}
          </Badge>
        </div>
        {candidateData.height != null && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              Height
            </label>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {candidateData.height} cm
            </p>
          </div>
        )}
        {candidateData.weight != null && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              Weight
            </label>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {candidateData.weight} kg
            </p>
          </div>
        )}
        {candidateData.skinTone && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              Skin Tone
            </label>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {candidateData.skinTone}
            </p>
          </div>
        )}
        {candidateData.languageProficiency && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              Language Proficiency
            </label>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {candidateData.languageProficiency}
            </p>
          </div>
        )}
        {candidateData.smartness && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              Smartness
            </label>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {candidateData.smartness}
            </p>
          </div>
        )}

        {/* Integrated Referral Fields */}
        {candidateData.source === "referral" && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                Referral Company
              </label>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                {candidateData.referralCompanyName || "N/A"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                Referral Email
              </label>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                {candidateData.referralEmail || "N/A"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                Referral Phone
              </label>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                {candidateData.referralCountryCode}
                {candidateData.referralPhone || "N/A"}
              </p>
            </div>
          </>
        )}
      </div>
      {/* Integrated Referral Description */}
      {candidateData.source === "referral" &&
        candidateData.referralDescription && (
          <div className="mt-4 p-4 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              Referral Description
            </label>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {candidateData.referralDescription}
            </p>
          </div>
        )}
    </CardContent>
  </Card>

  {/* Job Preferences */}
  <Card className="border border-slate-300 dark:border-slate-700 rounded-md shadow-sm bg-white dark:bg-black overflow-hidden">
    <CardHeader className="p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100 border-0 p-0">
          <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Job Preferences
        </CardTitle>
        {onEditStep && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            onClick={() => onEditStep(2)}
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Edit</span>
          </Button>
        )}
      </div>
    </CardHeader>
    <CardContent className="space-y-4 p-4 bg-white dark:bg-black">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Expected Salary Range
          </label>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {candidateData.expectedMinSalary !== undefined ? `$${candidateData.expectedMinSalary.toLocaleString()}` : "N/A"}
            {candidateData.expectedMaxSalary
              ? ` - $${candidateData.expectedMaxSalary.toLocaleString()}`
              : ""}
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Sector Type
          </label>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {candidateData.sectorType
              ? candidateData.sectorType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
              : "Not specified"}
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Visa Type
          </label>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {candidateData.visaType
              ? candidateData.visaType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
              : "Not specified"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">
            Preferred Countries
          </label>
          <div className="flex flex-wrap gap-2">
            {candidateData.preferredCountries &&
            candidateData.preferredCountries.length > 0 ? (
              candidateData.preferredCountries.map((country, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800/50"
                >
                  {country}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-400 dark:text-slate-500">None selected</span>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">
            Facility Preferences
          </label>
          <div className="flex flex-wrap gap-2">
            {candidateData.facilityPreferences &&
            candidateData.facilityPreferences.length > 0 ? (
              candidateData.facilityPreferences.map((facility, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50"
                >
                  {facility.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-400 dark:text-slate-500">None selected</span>
            )}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Educational Qualifications */}
  {((candidateData.qualifications &&
    candidateData.qualifications.length > 0) ||
    candidateData.highestEducation ||
    candidateData.university ||
    candidateData.graduationYear ||
    candidateData.gpa) && (
    <Card className="border border-slate-300 dark:border-slate-700 rounded-md shadow-sm bg-white dark:bg-black overflow-hidden">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100 border-0 p-0">
            <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Educational Qualifications
          </CardTitle>
          {onEditStep && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              onClick={() => onEditStep(3)}
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span className="text-xs font-bold uppercase tracking-wider">Edit</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 bg-white dark:bg-black">
        {candidateData.qualifications &&
          candidateData.qualifications.length > 0 && (
            <div className="space-y-4">
              {candidateData.qualifications.map(
                (qualification, index) => (
                  <div
                    key={qualification.id || index}
                    className="border border-slate-200 dark:border-slate-800 rounded-md p-4 bg-slate-50 dark:bg-slate-900/70"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Qualification
                        </label>
                        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {qualification.qualificationName ||
                            `Qualification ${qualification.qualificationId}`}
                        </p>
                      </div>
                      {qualification.university && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                            University
                          </label>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                            {qualification.university}
                          </p>
                        </div>
                      )}
                      {qualification.graduationYear && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                            Graduation Year
                          </label>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                            {qualification.graduationYear}
                          </p>
                        </div>
                      )}
                      {qualification.gpa && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                            GPA
                          </label>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                            {qualification.gpa}
                          </p>
                        </div>
                      )}
                    </div>
                    {qualification.notes && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Notes
                        </label>
                        <p className="mt-1 text-xs text-slate-800 dark:text-slate-300">
                          {qualification.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

        {(candidateData.highestEducation ||
          candidateData.university ||
          candidateData.graduationYear ||
          candidateData.gpa) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {candidateData.highestEducation && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Highest Education
                </label>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {candidateData.highestEducation}
                </p>
              </div>
            )}
            {candidateData.university && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  University
                </label>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {candidateData.university}
                </p>
              </div>
            )}
            {candidateData.graduationYear && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Graduation Year
                </label>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {candidateData.graduationYear}
                </p>
              </div>
            )}
            {candidateData.gpa && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  GPA
                </label>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {candidateData.gpa}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )}

  {/* Work Experience */}
  {candidateData.workExperiences &&
    candidateData.workExperiences.length > 0 && (
      <Card className="border border-slate-300 dark:border-slate-700 rounded-md shadow-sm bg-white dark:bg-black overflow-hidden">
        <CardHeader className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100 border-0 p-0">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Work Experience ({candidateData.workExperiences.length} entries)
            </CardTitle>
            {onEditStep && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                onClick={() => onEditStep(4)}
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span className="text-xs font-bold uppercase tracking-wider">Edit</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 bg-white dark:bg-black">
          {candidateData.workExperiences.map((experience, index) => (
            <div
              key={experience.id || index}
              className="border border-slate-200 dark:border-slate-800 rounded-md p-4 bg-slate-50 dark:bg-slate-900/70"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {experience.jobTitle}
                  </h4>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {experience.companyName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatDate(experience.startDate)} -{" "}
                    {experience.isCurrent ? "Present" : formatDate(experience.endDate)}
                  </p>
                  {experience.location && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {experience.location}
                    </p>
                  )}
                  {experience.description && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-2">{experience.description}</p>
                  )}
                  {experience.skills && experience.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {experience.skills.map(
                        (skill: string, skillIndex: number) => (
                          <Badge
                            key={skillIndex}
                            variant="outline"
                            className="text-xs text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-900"
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

  {/* Checklist */}
  <Card className="border border-slate-300 dark:border-slate-700 rounded-md shadow-sm bg-white dark:bg-black overflow-hidden">
    <CardHeader className="p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100 border-0 p-0">
          <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Final Checklist
        </CardTitle>
        {onEditStep && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            onClick={() => onEditStep(5)}
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Edit</span>
          </Button>
        )}
      </div>
    </CardHeader>
    <CardContent className="p-4 bg-white dark:bg-black">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Licensing Exam
          </label>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {candidateData.licensingExam && candidateData.licensingExam !== "none"
              ? candidateData.licensingExam.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
              : "None"}
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Data Flow
          </label>
          <div className="mt-1">
            {candidateData.dataFlow ? (
              <Badge className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950/50 border-green-200 dark:border-green-800/50">
                Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                Not Completed
              </Badge>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Eligibility
          </label>
          <div className="mt-1">
            {candidateData.eligibility ? (
              <Badge className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950/50 border-green-200 dark:border-green-800/50">
                Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                Not Verified
              </Badge>
            )}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
     <DialogFooter className="flex items-center justify-center gap-4 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-black">
  <Button
    type="button"
    variant="outline"
    onClick={onCancel}
    disabled={isLoading}
    className="min-w-[120px] border-slate-400 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-600 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
  >
    <X className="h-4 w-4 mr-2 text-slate-600 dark:text-slate-400" />
    Back to Edit
  </Button>
  <Button
    type="button"
    onClick={onConfirm}
    disabled={isLoading}
    className="min-w-[140px] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-700 dark:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded"
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
</DialogFooter>
    </DialogContent>
  </Dialog>
);

}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  GraduationCap,
  Briefcase,
  MapPin,
  Calendar,
  Phone,
  Mail,
} from "lucide-react";

interface CandidateInfoCardProps {
  candidate: {
    firstName: string;
    lastName: string;
    email?: string;
    mobileNumber?: string;
    countryCode?: string;
    dateOfBirth?: string;
    gender?: string;
    totalExperience?: number;
    source?: string;
    currentEmployer?: string | null;
    currentRole?: string | null;
    highestEducation?: string | null;
    university?: string | null;
    referralCompanyName?: string | null;
    referralCountryCode?: string | null;
    referralEmail?: string | null;
    referralPhone?: string | null;
    referralDescription?: string | null;
    qualifications?: Array<{
      id: string;
      university?: string;
      graduationYear?: number;
      gpa?: number;
      qualification?: {
        name: string;
        shortName?: string;
        level?: string;
        field?: string;
      };
    }>;
  };
}

export function CandidateInfoCard({ candidate }: CandidateInfoCardProps) {
  return (
    <Card className="border-0 shadow-xl overflow-hidden bg-white h-fit">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-slate-100 py-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-100">
            <User className="h-4 w-4 text-violet-600" />
          </div>
          Candidate Info
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Referral Quick View - shows at top for fast access */}
        {candidate.source === 'referral' && (
          <div className="p-3 rounded-lg bg-amber-50 border-l-4 border-amber-400">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-amber-700">Referral</p>
                <p className="text-sm font-bold text-amber-900 truncate">{candidate.referralCompanyName || 'N/A'}</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600 font-medium">Email:</span>
                    <span className="text-sm font-semibold text-amber-900 break-all">{candidate.referralEmail || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600 font-medium">Phone:</span>
                    <span className="text-sm font-semibold text-amber-900">{candidate.referralCountryCode || ''} {candidate.referralPhone || 'N/A'}</span>
                  </div>
                  {candidate.referralDescription && (
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] text-slate-600">Note:</span>
                      <span className="text-xs text-slate-600">{candidate.referralDescription}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personal Details Grid - Compact */}
        <div className="grid grid-cols-2 gap-2">
          <InfoItem icon={<Calendar className="h-3 w-3" />} label="Age" value={candidate.dateOfBirth ? `${calculateAge(candidate.dateOfBirth)}y` : "N/A"} />
          <InfoItem icon={<Briefcase className="h-3 w-3" />} label="Exp" value={candidate.totalExperience ? `${candidate.totalExperience}y` : "N/A"} />
          <InfoItem icon={<MapPin className="h-3 w-3" />} label="Source" value={candidate.source || "N/A"} capitalize />
          <InfoItem icon={<User className="h-3 w-3" />} label="Gender" value={candidate.gender || "N/A"} />
        </div>

        {/* Contact Info - Compact */}
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Mail className="h-3 w-3 text-blue-500" />
            <span className="text-slate-600 truncate">{candidate.email || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Phone className="h-3 w-3 text-emerald-500" />
            <span className="text-slate-600">{candidate.mobileNumber ? `${candidate.countryCode || ""} ${candidate.mobileNumber}` : "N/A"}</span>
          </div>
        </div>

        {/* Qualifications - Compact */}
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <GraduationCap className="h-3 w-3" />
            Qualifications
          </h4>
          <div className="space-y-2 max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
            {candidate.qualifications && candidate.qualifications.length > 0 ? (
              candidate.qualifications.map((q) => (
                <div key={q.id} className="flex items-center gap-2 p-2 rounded-lg bg-violet-50 border border-violet-100">
                  <GraduationCap className="h-4 w-4 text-violet-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{q.qualification?.name || "Qualification"}</p>
                    <p className="text-[10px] text-slate-500 truncate">{q.university || "University N/A"}</p>
                  </div>
                  {q.graduationYear && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{q.graduationYear}</Badge>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="text-xs text-slate-400">No qualifications</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ icon, label, value, capitalize = false }: { icon: React.ReactNode; label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
      <div className="flex items-center gap-1 text-slate-400 mb-0.5">
        {icon}
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      <p className={`text-xs font-bold text-slate-800 ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CandidateQualificationSelect } from "@/components/molecules";
import { GraduationCap } from "lucide-react";

type CandidateQualification = {
  id: string;
  qualificationId: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
  isCompleted: boolean;
  notes?: string;
};

interface EducationalQualificationStepProps {
  qualifications: CandidateQualification[];
  setQualifications: (qualifications: CandidateQualification[]) => void;
}

export const EducationalQualificationStep: React.FC<EducationalQualificationStepProps> = ({
  qualifications,
  setQualifications,
}) => {
  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <GraduationCap className="h-5 w-5 text-blue-600" />
          Educational Qualifications
        </CardTitle>
        <CardDescription>
          Select and manage multiple educational qualifications for the candidate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <CandidateQualificationSelect
          value={qualifications}
          onChange={(newQualifications: CandidateQualification[]) => {
            setQualifications(newQualifications);
          }}
        />
      </CardContent>
    </Card>
  );
};

export default EducationalQualificationStep;
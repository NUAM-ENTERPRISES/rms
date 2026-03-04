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
    <Card className="border-0 shadow-lg bg-white/80 dark:bg-black backdrop-blur-sm dark:backdrop-blur-none">
      <CardHeader className="border-b border-slate-200 dark:border-slate-800">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800 dark:text-slate-100">
          <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Educational Qualifications
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Select and manage multiple educational qualifications for the candidate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6 bg-white dark:bg-black">
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
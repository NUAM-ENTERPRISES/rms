import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { Can } from "@/components/auth/Can";
import RecruiterCandidatesTab from "./RecruiterCandidatesTab";
import EligibleCandidatesTab from "./EligibleCandidatesTab";

interface ProjectDetailTabsProps {
  projectId: string;
}

export default function ProjectDetailTabs({
  projectId,
}: ProjectDetailTabsProps) {
  const { hasRole } = usePermissions();
  
  // Check if user is a recruiter (non-manager)
  const isRecruiter = hasRole("Recruiter");
  const isManager = hasRole([
    "CEO",
    "Director",
    "Manager",
    "Team Head",
    "Team Lead",
  ]);

  // Set default tab - "eligible" (Eligible Candidates) is the first tab for all roles
  const [activeTab, setActiveTab] = useState("eligible");

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <Can
            roles={[
              "CEO",
              "Director",
              "Manager",
              "Team Head",
              "Team Lead",
              "Recruiter",
              "Documentation Executive",
              "Processing Executive",
            ]}
          >
            <TabsTrigger value="eligible">Eligible Candidates</TabsTrigger>
          </Can>
          <Can roles={["Recruiter", "CEO", "Director", "Manager", "Team Head", "Team Lead"]}>
            <TabsTrigger value="recruiter">
              {isRecruiter && !isManager ? "My Candidates" : "All Candidates"}
            </TabsTrigger>
          </Can>
        </TabsList>

        <Can
          roles={[
            "CEO",
            "Director",
            "Manager",
            "Team Head",
            "Team Lead",
            "Recruiter",
            "Documentation Executive",
            "Processing Executive",
          ]}
        >
          <TabsContent value="eligible" className="mt-6">
            <EligibleCandidatesTab projectId={projectId} />
          </TabsContent>
        </Can>

        <Can roles={["Recruiter", "CEO", "Director", "Manager", "Team Head", "Team Lead"]}>
          <TabsContent value="recruiter" className="mt-6">
            <RecruiterCandidatesTab projectId={projectId} />
          </TabsContent>
        </Can>
      </Tabs>
    </div>
  );
}
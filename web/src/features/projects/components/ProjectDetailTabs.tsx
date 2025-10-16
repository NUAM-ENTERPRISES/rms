import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { Can } from "@/components/auth/Can";
import RecruiterCandidatesTab from "./RecruiterCandidatesTab";
import NominatedCandidatesTab from "./NominatedCandidatesTab";
import VerificationCandidatesTab from "./VerificationCandidatesTab";
import ProcessingCandidatesTab from "./ProcessingCandidatesTab";

interface ProjectDetailTabsProps {
  projectId: string;
}

export default function ProjectDetailTabs({
  projectId,
}: ProjectDetailTabsProps) {
  const { hasRole } = usePermissions();
  const [activeTab, setActiveTab] = useState("recruiter");

  // Determine which tabs to show based on user role
  const isRecruiter = hasRole("Recruiter");
  const isDocumentationExecutive = hasRole("Documentation Executive");
  const isProcessingExecutive = hasRole("Processing Executive");
  const isManager = hasRole([
    "CEO",
    "Director",
    "Manager",
    "Team Head",
    "Team Lead",
  ]);

  // Set default tab based on role
  if (isRecruiter && activeTab !== "recruiter") {
    setActiveTab("recruiter");
  } else if (isDocumentationExecutive && activeTab === "recruiter") {
    setActiveTab("verification");
  } else if (isProcessingExecutive && activeTab === "recruiter") {
    setActiveTab("processing");
  }

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <Can roles={["Recruiter"]}>
            <TabsTrigger value="recruiter">My Assigned Candidates</TabsTrigger>
          </Can>
          <Can
            roles={[
              "CEO",
              "Director",
              "Manager",
              "Team Head",
              "Team Lead",
              "Documentation Executive",
              "Processing Executive",
            ]}
          >
            <TabsTrigger value="nominated">Nominated Candidates</TabsTrigger>
          </Can>
          <Can
            roles={[
              "CEO",
              "Director",
              "Manager",
              "Team Head",
              "Team Lead",
              "Documentation Executive",
            ]}
          >
            <TabsTrigger value="verification">In Verification</TabsTrigger>
          </Can>
          <Can
            roles={[
              "CEO",
              "Director",
              "Manager",
              "Team Head",
              "Team Lead",
              "Processing Executive",
            ]}
          >
            <TabsTrigger value="processing">Processing</TabsTrigger>
          </Can>
        </TabsList>

        <Can roles={["Recruiter"]}>
          <TabsContent value="recruiter" className="mt-6">
            <RecruiterCandidatesTab projectId={projectId} />
          </TabsContent>
        </Can>

        <Can
          roles={[
            "CEO",
            "Director",
            "Manager",
            "Team Head",
            "Team Lead",
            "Documentation Executive",
            "Processing Executive",
          ]}
        >
          <TabsContent value="nominated" className="mt-6">
            <NominatedCandidatesTab projectId={projectId} />
          </TabsContent>
        </Can>

        <Can
          roles={[
            "CEO",
            "Director",
            "Manager",
            "Team Head",
            "Team Lead",
            "Documentation Executive",
          ]}
        >
          <TabsContent value="verification" className="mt-6">
            <VerificationCandidatesTab projectId={projectId} />
          </TabsContent>
        </Can>

        <Can
          roles={[
            "CEO",
            "Director",
            "Manager",
            "Team Head",
            "Team Lead",
            "Processing Executive",
          ]}
        >
          <TabsContent value="processing" className="mt-6">
            <ProcessingCandidatesTab projectId={projectId} />
          </TabsContent>
        </Can>
      </Tabs>
    </div>
  );
}

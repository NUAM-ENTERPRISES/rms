/**
 * Cross-domain process: Assign Candidate to Project
 * Following FE_GUIDELINES.md processes pattern - orchestrates multiple endpoints
 */

import { useState } from "react";
import { toast } from "sonner";
import { candidatesApi, CandidateProjectMap } from "@/features/candidates/api";
import { projectsApi } from "@/features/projects/api";

interface AssignCandidateParams {
  candidateId: string;
  projectId: string;
  notes?: string;
}

interface AssignCandidateResult {
  success: boolean;
  candidateProjectId?: string;
  error?: string;
}

export function useAssignCandidate() {
  const [isLoading, setIsLoading] = useState(false);

  // RTK Query mutations
  const [nominateCandidate] = candidatesApi.useNominateCandidateMutation();
  const [getProjectById] = projectsApi.useLazyGetProjectQuery();
  const [getCandidateById] = candidatesApi.useLazyGetCandidateByIdQuery();

  const assignCandidate = async (
    params: AssignCandidateParams
  ): Promise<AssignCandidateResult> => {
    setIsLoading(true);

    try {
      // Step 1: Validate candidate exists and is available
      const candidateResult = await getCandidateById(params.candidateId);
      if (candidateResult.error) {
        throw new Error("Candidate not found");
      }

      const candidate = candidateResult.data;
      if (!candidate) {
        throw new Error("Candidate not found");
      }

      const statusName = typeof candidate.currentStatus === 'string' 
        ? candidate.currentStatus 
        : candidate.currentStatus?.statusName;

      if (statusName !== "active") {
        throw new Error("Candidate is not available for assignment");
      }

      // Step 2: Validate project exists and has open positions
      const projectResult = await getProjectById(params.projectId);
      if (projectResult.error) {
        throw new Error("Project not found");
      }

      const project = projectResult.data?.data;
      if (!project) {
        throw new Error("Project not found");
      }

      if (project.status !== "active") {
        throw new Error("Project is not active");
      }

      // Step 3: Check if candidate is already assigned to this project
      const existingAssignment = candidate.projects?.find(
        (p: CandidateProjectMap) => p.projectId === params.projectId
      );

      if (existingAssignment) {
        throw new Error("Candidate is already assigned to this project");
      }

      // Step 4: Nominate candidate to project
      const nominationResult = await nominateCandidate({
        candidateId: params.candidateId,
        projectId: params.projectId,
        notes: params.notes,
      });

      if (nominationResult.error) {
        throw new Error("Failed to nominate candidate");
      }

      // Step 5: Success feedback
      const candidateName = candidate.name || `${candidate.firstName} ${candidate.lastName}`;
      toast.success(
        `${candidateName} has been successfully assigned to ${project.title}`
      );

      return {
        success: true,
        candidateProjectId: nominationResult.data?.data?.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Assignment failed";
      toast.error(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    assignCandidate,
    isLoading,
  };
}

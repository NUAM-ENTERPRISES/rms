/**
 * Cross-domain process: Document Verification Workflow
 * Following FE_GUIDELINES.md processes pattern - orchestrates multiple endpoints
 */

import { useState } from "react";
import { toast } from "sonner";
import { documentsApi } from "@/features/documents/api";
import { candidatesApi } from "@/features/candidates/api";

interface DocumentWorkflowParams {
  documentId: string;
  candidateProjectMapId: string;
  action: "verify" | "reject" | "request_resubmission";
  notes?: string;
  rejectionReason?: string;
}

interface DocumentWorkflowResult {
  success: boolean;
  canApproveCandidate?: boolean;
  error?: string;
}

export function useDocumentWorkflow() {
  const [isLoading, setIsLoading] = useState(false);

  // RTK Query mutations
  const [verifyDocument] = documentsApi.useVerifyDocumentMutation();
  const [requestResubmission] = documentsApi.useRequestResubmissionMutation();
  const [getDocumentSummary] = documentsApi.useLazyGetDocumentSummaryQuery();
  const [approveCandidate] = candidatesApi.useApproveCandidateMutation();

  const processDocument = async (
    params: DocumentWorkflowParams
  ): Promise<DocumentWorkflowResult> => {
    setIsLoading(true);

    try {
      let result;

      // Step 1: Process the document based on action
      switch (params.action) {
        case "verify":
          result = await verifyDocument({
            documentId: params.documentId,
            candidateProjectMapId: params.candidateProjectMapId,
            status: "verified",
            notes: params.notes,
          });
          break;

        case "reject":
          result = await verifyDocument({
            documentId: params.documentId,
            candidateProjectMapId: params.candidateProjectMapId,
            status: "rejected",
            notes: params.notes,
            rejectionReason: params.rejectionReason,
          });
          break;

        case "request_resubmission":
          result = await requestResubmission({
            documentId: params.documentId,
            candidateProjectMapId: params.candidateProjectMapId,
            reason: params.rejectionReason || "Document requires resubmission",
          });
          break;

        default:
          throw new Error("Invalid action");
      }

      if (result.error) {
        throw new Error("Document processing failed");
      }

      // Step 2: Check if all documents are now verified
      const summaryResult = await getDocumentSummary(
        params.candidateProjectMapId
      );

      if (summaryResult.error) {
        throw new Error("Failed to get document summary");
      }

      const summary = summaryResult.data?.data;
      const canApproveCandidate = summary?.canApproveCandidate || false;

      // Step 3: Auto-approve candidate if all documents are verified
      if (canApproveCandidate && params.action === "verify") {
        try {
          await approveCandidate({
            candidateProjectMapId: params.candidateProjectMapId,
            notes: "Auto-approved after all documents verified",
          });

          toast.success(
            `Document ${params.action}d successfully. Candidate has been auto-approved!`
          );
        } catch (approvalError) {
          // Document verification succeeded, but auto-approval failed
          toast.success(
            `Document ${params.action}d successfully. Manual candidate approval required.`
          );
        }
      } else {
        // Standard success message
        const actionPastTense = {
          verify: "verified",
          reject: "rejected",
          request_resubmission: "marked for resubmission",
        };

        toast.success(
          `Document ${actionPastTense[params.action]} successfully`
        );
      }

      return {
        success: true,
        canApproveCandidate,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Document processing failed";
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
    processDocument,
    isLoading,
  };
}

export const WORKFLOW_STATUS_MAPPING = {
  documentation: {
    mainStatus: "documents",
    subStatuses: [
      { name: "pending_documents", label: "Pending Documents" },
      { name: "documents_submitted", label: "Submitted" },
      { name: "verification_in_progress_document", label: "Verifying" },
      { name: "documents_verified", label: "Verified" },
      { name: "client_revision_requested", label: "Client Revision Requested" },
      { name: "documents_re_submission_requested", label: "Re-submission Requested" },
      { name: "rejected_documents", label: "Rejected" },
      { name: "submitted_to_client", label: "Submitted to Client" },
    ],
  },
  screening: {
    mainStatus: "interview",
    subStatuses: [
      { name: "screening_assigned", label: "Screening Assigned" },
      { name: "screening_scheduled", label: "Screening Scheduled" },
      { name: "screening_completed", label: "Screening Completed" },
      { name: "screening_passed", label: "Screening Passed" },
      { name: "screening_needs_training", label: "Screening Needs Training" },
      { name: "screening_on_hold", label: "Screening On Hold" },
      { name: "screening_failed", label: "Screening Failed" },
      { name: "training_assigned", label: "Training Assigned" },
      { name: "training_scheduled", label: "Training Scheduled" },
      { name: "training_in_progress", label: "Training In Progress" },
      { name: "training_completed", label: "Training Completed" },
      { name: "ready_for_reassessment", label: "Ready For Reassessment" },
    ],
  },
  interview: {
    mainStatus: "interview",
    subStatuses: [
      { name: "shortlisted", label: "Shortlisted" },
      { name: "not_shortlisted", label: "Not Shortlisted" },
      { name: "interview_assigned", label: "Assigned" },
      { name: "interview_scheduled", label: "Scheduled" },
      { name: "interview_rescheduled", label: "Rescheduled" },
      { name: "interview_completed", label: "Completed" },
      { name: "interview_passed", label: "Passed" },
      { name: "interview_failed", label: "Failed" },
      { name: "interview_backout", label: "Backout" },
      { name: "interview_selected", label: "Selected" },
    ],
  },
  processing: {
    mainStatus: "processing",
    subStatuses: [
      { name: "transfered_to_processing", label: "Transferred" },
      { name: "processing_in_progress", label: "In Progress" },
      { name: "processing_completed", label: "Completed" },
      { name: "processing_cancelled", label: "Cancelled" },
      { name: "ready_for_final", label: "Ready for Final" },
    ],
  },
} as const;

export type WorkflowStatusKey = keyof typeof WORKFLOW_STATUS_MAPPING;

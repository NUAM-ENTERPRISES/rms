// prisma/seeds/candidate-project-workflow.seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function seedCandidateProjectWorkflow() {
  console.log("🌱 Seeding Candidate Project Main & Sub Statuses...");

  // -----------------------------
  // MAIN STATUS DEFINITIONS
  // -----------------------------
  const mainStatuses = [
    { name: "nominated", label: "Nominated", color: "blue", order: 1 },
    { name: "documents", label: "Documents", color: "yellow", order: 2 },
    { name: "interview", label: "Interview", color: "purple", order: 3 },
    // { name: "selection", label: "Selection", color: "green", order: 4 },
    { name: "processing", label: "Processing", color: "orange", order: 4 },
    { name: "final", label: "Final", color: "green", order: 5 },
    { name: "rejected", label: "Rejected", color: "red", order: 6 },
    { name: "withdrawn", label: "Withdrawn", color: "gray", order: 7 },
    { name: "on_hold", label: "On Hold", color: "yellow", order: 8 },
  ];

  // -----------------------------
  // SUB STATUS DEFINITIONS
  // -----------------------------
  const subStatuses = [
    // NOMINATED
    { name: "nominated_initial", label: "Nominated", order: 1, main: "nominated" },

    // DOCUMENTS
    { name: "pending_documents", label: "Pending Documents", order: 1, main: "documents" },
    { name: "documents_submitted", label: "Documents Submitted", order: 2, main: "documents" },
    { name: "verification_in_progress_document", label: "Verification In Progress", order: 3, main: "documents" },
    { name: "documents_verified", label: "Verified Documents", order: 4, main: "documents" },
    { name: "documents_re_submission_requested", label: "Document Re-Submission Requested", order: 5, main: "documents" },
    { name: "rejected_documents", label: "Rejected Documents", order: 6, main: "documents" },

    // INTERVIEW
    {name: "interview_assigned", label: "Interview Assigned", order: 1, main: "interview" },
    { name: "interview_scheduled", label: "Interview Scheduled", order: 2, main: "interview" },
    { name: "interview_rescheduled", label: "Interview Rescheduled", order: 3, main: "interview" },
    { name: "interview_completed", label: "Interview Completed", order: 4, main: "interview" },
    { name: "interview_passed", label: "Interview Passed", order: 5, main: "interview" },
    { name: "interview_failed", label: "Interview Failed", order: 6, main: "interview" },
    // SCREENING (formerly Mock Interview)
    { name: "screening_assigned", label: "Screening Assigned", order: 7, main: "interview" },
    { name: "screening_scheduled", label: "Screening Scheduled", order: 8, main: "interview" },
    { name: "screening_completed", label: "Screening Completed", order: 9, main: "interview" },
    { name: "screening_passed", label: "Screening Passed", order: 10, main: "interview" },
    { name: "screening_failed", label: "Screening Failed", order: 11, main: "interview" },
    // TRAINING (interview categories)
    { name: "training_assigned", label: "Training Assigned", order: 12, main: "interview" },
    { name: "training_in_progress", label: "Training In Progress", order: 13, main: "interview" },
    { name: "training_completed", label: "Training Completed", order: 14, main: "interview" },
    { name: "ready_for_reassessment", label: "Ready For Reassessment", order: 14, main: "interview" },
    { name: "interview_selected", label: "Interview Selected", order: 15, main: "interview" },
    



    // PROCESSING
    {name : "transfered_to_processing", label: "Transferred to Processing", order: 1, main: "processing" },
    { name: "processing_in_progress", label: "Processing In Progress", order: 2, main: "processing" },
    { name: "processing_completed", label: "Processing Completed", order: 3, main: "processing" },
    { name: "processing_failed", label: "Processing Failed", order: 4, main: "processing" },
    { name: "ready_for_final", label: "Ready For Final", order: 5, main: "processing" },
    // FINAL
    { name: "hired", label: "Hired", order: 1, main: "final" },

    // REJECTED
    { name: "rejected_interview", label: "Rejected - Interview", order: 1, main: "rejected" },
    { name: "rejected_selection", label: "Rejected - Selection", order: 2, main: "rejected" },

    // WITHDRAWN
    { name: "withdrawn", label: "Withdrawn", order: 1, main: "withdrawn" },

    // ON HOLD
    { name: "on_hold", label: "On Hold", order: 1, main: "on_hold" },
  ];

  // Insert MAIN statuses using upsert
  const mainMap: Record<string, string> = {};

  for (const main of mainStatuses) {
    const created = await prisma.candidateProjectMainStatus.upsert({
      where: { name: main.name },
      update: {
        label: main.label,
        color: main.color,
        order: main.order,
      },
      create: {
        name: main.name,
        label: main.label,
        color: main.color,
        order: main.order,
      },
    });

    mainMap[main.name] = created.id; // Store ID for linking sub statuses
  }

  // Insert SUB statuses
  for (const sub of subStatuses) {
    await prisma.candidateProjectSubStatus.upsert({
      where: { name: sub.name },
      update: {
        label: sub.label,
        order: sub.order,
        stageId: mainMap[sub.main],
      },
      create: {
        name: sub.name,
        label: sub.label,
        order: sub.order,
        stageId: mainMap[sub.main],
      },
    });
  }

  console.log("✅ Main & Sub Statuses Seeded Successfully!");
}

import { describe, it, expect } from "vitest";
import { resolveNotificationPath } from "./resolveNotificationPath";
import type { NotificationDto } from "@/features/notifications/data";

const baseNotification: NotificationDto = {
  id: "n-1",
  type: "recruiter_notification",
  title: "Test",
  message: "Test message",
  link: null,
  meta: null,
  status: "unread",
  readAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("resolveNotificationPath", () => {
  it("routes offer letter upload required notifications to recruiter docs detail", () => {
    const path = resolveNotificationPath({
      ...baseNotification,
      type: "offer_letter_upload_requested",
      title: "Offer Letter Upload Required",
      link: "/recruiter-docs/proj-1/cand-1",
      meta: {
        candidateId: "cand-1",
        projectId: "proj-1",
      },
    });

    expect(path).toBe("/recruiter-docs/proj-1/cand-1");
  });

  it("routes offer letter uploaded notifications to recruiter docs detail", () => {
    const path = resolveNotificationPath({
      ...baseNotification,
      type: "offer_letter_uploaded",
      link: "/candidates/cand-1",
      meta: {
        candidateId: "cand-1",
        projectId: "proj-1",
      },
    });

    expect(path).toBe("/recruiter-docs/proj-1/cand-1");
  });

  it("routes sent-for-processing processing leadership notifications to ready for processing page", () => {
    const path = resolveNotificationPath({
      ...baseNotification,
      type: "candidate_ready_for_processing",
      link: "/ready-for-processing?projectId=proj-1&search=Anandhu+TP+Stewart",
      meta: {
        type: "candidate_ready_for_processing",
        candidateId: "cand-1",
        candidateName: "Anandhu TP Stewart",
        projectId: "proj-1",
        targetRole: "Processing Manager",
        navigationTarget: "ready_for_processing",
      },
    });

    expect(path).toBe(
      "/ready-for-processing?projectId=proj-1&search=Anandhu+TP+Stewart",
    );
  });

  it("routes sent-for-processing recruiter notifications to candidate detail", () => {
    const path = resolveNotificationPath({
      ...baseNotification,
      type: "recruiter_notification",
      link: "/ready-for-processing?projectId=proj-1",
      meta: {
        type: "candidate_ready_for_processing",
        candidateId: "cand-1",
        candidateName: "Anandhu TP Stewart",
        projectId: "proj-1",
      },
    });

    expect(path).toBe("/candidates/cand-1");
  });

  it("routes sent-for-processing recruiter manager notifications to candidate detail", () => {
    const path = resolveNotificationPath({
      ...baseNotification,
      type: "candidate_ready_for_processing",
      link: "/candidates/cand-1",
      meta: {
        type: "candidate_ready_for_processing",
        candidateId: "cand-1",
        candidateName: "Anandhu TP Stewart",
        projectId: "proj-1",
        targetRole: "Recruiter Manager",
        navigationTarget: "candidate_detail",
      },
    });

    expect(path).toBe("/candidates/cand-1");
  });

  it("routes legacy sent-for-processing recruiter manager notifications to candidate detail", () => {
    const path = resolveNotificationPath({
      ...baseNotification,
      type: "candidate_ready_for_processing",
      link: "/ready-for-processing?projectId=proj-1&search=Anandhu+TP+Stewart",
      meta: {
        type: "candidate_ready_for_processing",
        candidateId: "cand-1",
        candidateName: "Anandhu TP Stewart",
        projectId: "proj-1",
      },
    });

    expect(path).toBe("/candidates/cand-1");
  });

  it("routes legacy sent-for-processing recruiter-docs links to candidate detail", () => {
    const path = resolveNotificationPath({
      ...baseNotification,
      type: "candidate_ready_for_processing",
      link: "/recruiter-docs/proj-1/cand-1",
      meta: {
        type: "candidate_ready_for_processing",
        candidateId: "cand-1",
        candidateName: "Anandhu TP Stewart",
        projectId: "proj-1",
      },
    });

    expect(path).toBe("/candidates/cand-1");
  });
});

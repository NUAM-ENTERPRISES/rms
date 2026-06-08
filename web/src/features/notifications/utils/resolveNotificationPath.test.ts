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
});

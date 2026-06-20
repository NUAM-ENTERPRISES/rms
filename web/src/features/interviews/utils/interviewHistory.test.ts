import { describe, expect, it } from "vitest";
import { mergeSentForProcessingHistoryItem } from "./interviewHistory";

describe("mergeSentForProcessingHistoryItem", () => {
  it("enriches existing sent for processing rows with coordinator name", () => {
    const result = mergeSentForProcessingHistoryItem(
      [
        {
          id: "hist-sent",
          interviewId: "int-1",
          status: "sent_for_processing",
          statusAt: "2026-06-09T12:20:00.000Z",
        },
      ],
      {
        id: "int-1",
        readyForProcessingAt: "2026-06-09T12:20:00.000Z",
        outcome: "passed",
        readyForProcessingBy: { name: "Rachel Interview Coordinator" },
        project: { title: "Aster" },
      },
    );

    expect(result[0].changedByName).toBe("Rachel Interview Coordinator");
  });

  it("falls back to passed history actor when readyForProcessingBy is missing", () => {
    const result = mergeSentForProcessingHistoryItem(
      [
        {
          id: "hist-passed",
          interviewId: "int-1",
          status: "passed",
          statusAt: "2026-06-10T06:10:00.000Z",
          changedByName: "Rachel Interview Coordinator",
        },
        {
          id: "hist-sent",
          interviewId: "int-1",
          status: "sent_for_processing",
          statusAt: "2026-06-10T06:10:00.000Z",
        },
      ],
      {
        id: "int-1",
        readyForProcessingAt: "2026-06-10T06:10:00.000Z",
        outcome: "passed",
        project: { title: "Aster" },
      },
    );

    const sent = result.find((item) => item.status === "sent_for_processing");
    expect(sent?.changedByName).toBe("Rachel Interview Coordinator");
  });
});

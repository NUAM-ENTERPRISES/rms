import { describe, expect, it } from "vitest";
import {
  shouldShowDirectScreeningSkipDocVerification,
  DIRECT_SCREENING_SKIP_DOC_VERIFICATION_STATUSES,
  isDocVerificationSendBlockedByStatus,
} from "./direct-screening-doc-verification";

describe("shouldShowDirectScreeningSkipDocVerification", () => {
  it("shows skip warning during active direct screening", () => {
    for (const status of DIRECT_SCREENING_SKIP_DOC_VERIFICATION_STATUSES) {
      expect(
        shouldShowDirectScreeningSkipDocVerification({
          isNominated: false,
          isSendedForDocumentVerification: false,
          subStatusName: status,
        }),
      ).toBe(true);
    }
  });

  it("hides skip warning after screening is passed", () => {
    expect(
      shouldShowDirectScreeningSkipDocVerification({
        isNominated: false,
        isSendedForDocumentVerification: false,
        subStatusName: "screening_passed",
      }),
    ).toBe(false);
  });

  it("hides skip warning after training is completed", () => {
    expect(
      shouldShowDirectScreeningSkipDocVerification({
        isNominated: false,
        isSendedForDocumentVerification: false,
        subStatusName: "training_completed",
      }),
    ).toBe(false);
  });

  it("hides skip warning for nominated candidates", () => {
    expect(
      shouldShowDirectScreeningSkipDocVerification({
        isNominated: true,
        isSendedForDocumentVerification: false,
        subStatusName: "screening_assigned",
      }),
    ).toBe(false);
  });

  it("hides skip warning once document verification has started", () => {
    expect(
      shouldShowDirectScreeningSkipDocVerification({
        isNominated: false,
        isSendedForDocumentVerification: true,
        subStatusName: "screening_assigned",
      }),
    ).toBe(false);
  });
});

describe("isDocVerificationSendBlockedByStatus", () => {
  it("blocks send during active screening and training", () => {
    expect(isDocVerificationSendBlockedByStatus("screening_assigned")).toBe(true);
    expect(isDocVerificationSendBlockedByStatus("training_in_progress")).toBe(true);
    expect(isDocVerificationSendBlockedByStatus("screening_completed")).toBe(true);
  });

  it("allows send after screening passed or training completed", () => {
    expect(isDocVerificationSendBlockedByStatus("screening_passed")).toBe(false);
    expect(isDocVerificationSendBlockedByStatus("training_completed")).toBe(false);
  });
});

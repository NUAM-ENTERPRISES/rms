import { describe, it, expect } from "vitest";
import {
  buildOfferLetterNominationKey,
  buildPassedInterviewNominationLookup,
  canShowOfferLetterUploadButton,
  canUserUploadOfferLetter,
  findOfferLetterForNomination,
  getOfferLetterOverrideKey,
  getOfferLetterUploadRequestRequesterLabel,
  hasOfferLetter,
  hasPassedInterviewForNomination,
  isOfferLetterUploadEligible,
  resolveOfferLetterFileUrl,
} from "./offerLetter";

const baseItem = {
  id: "int-1",
  isOfferLetterUploaded: true,
  candidateProjectMap: {
    candidate: { id: "cand-1" },
    project: { id: "proj-1" },
    roleNeeded: {
      roleCatalogId: "role-1",
      roleCatalog: { id: "role-1" },
    },
  },
  offerLetterData: {
    document: {
      fileUrl: "https://cdn.example.com/new-offer.pdf",
      uploadedByUser: { name: "Recruiter One" },
    },
  },
};

describe("offerLetter utils", () => {
  it("builds a stable override key from candidate, project, and role", () => {
    expect(getOfferLetterOverrideKey(baseItem)).toBe("cand-1:proj-1:role-1");
  });

  it("allows offer letter upload only after interview passed or later stages", () => {
    expect(isOfferLetterUploadEligible("interview_scheduled")).toBe(false);
    expect(isOfferLetterUploadEligible("interview_passed")).toBe(true);
    expect(isOfferLetterUploadEligible("transfered_to_processing")).toBe(true);
  });

  it("hides offer letter upload for recruiters when a letter already exists", () => {
    expect(
      canShowOfferLetterUploadButton({
        isRecruiter: true,
        hasOfferLetter: true,
        canUpload: true,
      }),
    ).toBe(false);

    expect(
      canShowOfferLetterUploadButton({
        isRecruiter: true,
        hasOfferLetter: false,
        canUpload: true,
      }),
    ).toBe(true);

    expect(
      canShowOfferLetterUploadButton({
        isRecruiter: false,
        hasOfferLetter: true,
        canUpload: true,
      }),
    ).toBe(true);
  });

  it("builds passed interview lookup from project nominations", () => {
    const lookup = buildPassedInterviewNominationLookup([
      {
        candidateProjectMap: {
          id: "map-1",
          project: { id: "proj-1" },
          roleNeeded: { roleCatalogId: "role-1" },
        },
      },
    ]);

    expect(
      hasPassedInterviewForNomination({
        nominationMapId: "map-1",
        projectId: "proj-1",
        roleCatalogId: "role-1",
        passedInterviewLookup: lookup,
      }),
    ).toBe(true);
    expect(
      buildOfferLetterNominationKey("proj-1", "role-1"),
    ).toBe("proj-1-role-1");
    expect(lookup.roleCatalogByMapId.get("map-1")).toBe("role-1");
  });

  it("lets recruiters upload when a passed interview exists even if sub-status lags", () => {
    expect(
      canUserUploadOfferLetter({
        isRecruiter: true,
        isInterviewCoordinator: false,
        canUploadDocuments: false,
        canWriteCandidates: false,
        canUploadInterviews: false,
        subStatusName: "interview_completed",
        hasPassedInterview: true,
      }),
    ).toBe(true);
  });

  it("lets recruiters upload only when nomination is interview-passed eligible", () => {
    expect(
      canUserUploadOfferLetter({
        isRecruiter: true,
        isInterviewCoordinator: false,
        canUploadDocuments: false,
        canWriteCandidates: false,
        canUploadInterviews: false,
        subStatusName: "interview_passed",
      }),
    ).toBe(true);

    expect(
      canUserUploadOfferLetter({
        isRecruiter: true,
        isInterviewCoordinator: false,
        canUploadDocuments: false,
        canWriteCandidates: false,
        canUploadInterviews: false,
        subStatusName: "interview_scheduled",
      }),
    ).toBe(false);
  });

  it("lets interview coordinators upload without write:interviews when interview passed", () => {
    expect(
      canUserUploadOfferLetter({
        isRecruiter: false,
        isInterviewCoordinator: true,
        canUploadDocuments: false,
        canWriteCandidates: false,
        canUploadInterviews: false,
        subStatusName: "interview_completed",
        hasPassedInterview: true,
      }),
    ).toBe(true);
  });

  it("matches offer letters per project nomination, not by role alone", () => {
    const offerLetters = [
      {
        fileUrl: "https://cdn.example.com/test-offer.pdf",
        roleCatalogId: "role-1",
        verifications: [
          {
            candidateProjectMapId: "map-test",
            candidateProjectMap: {
              id: "map-test",
              project: { id: "proj-test" },
            },
          },
        ],
      },
    ];

    expect(
      findOfferLetterForNomination(offerLetters, {
        nominationMapId: "map-test",
        projectId: "proj-test",
        roleCatalogId: "role-1",
      }),
    ).toBe(offerLetters[0]);

    expect(
      findOfferLetterForNomination(offerLetters, {
        nominationMapId: "map-astr",
        projectId: "proj-astr",
        roleCatalogId: "role-1",
      }),
    ).toBeUndefined();
  });

  it("prefers the server file URL over stale local overrides after recruiter re-upload", () => {
    const overrides = {
      "cand-1:proj-1:role-1": "https://cdn.example.com/old-offer.pdf",
      "cand-1": "https://cdn.example.com/old-offer.pdf",
    };

    expect(resolveOfferLetterFileUrl(baseItem, overrides)).toBe(
      "https://cdn.example.com/new-offer.pdf",
    );
    expect(hasOfferLetter(baseItem, overrides)).toBe(true);
  });

  it("extracts requester label from upload request reason", () => {
    expect(
      getOfferLetterUploadRequestRequesterLabel(
        "Please call the candidate. (Requested by Rachel Interview Coordinator)",
      ),
    ).toBe("Rachel Interview Coordinator");
  });
});

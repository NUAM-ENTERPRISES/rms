import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReceivedDocumentVerificationSummary } from "../ReceivedDocumentVerificationSummary";

describe("ReceivedDocumentVerificationSummary", () => {
  it("renders arrived and not-arrived documents with remarks", () => {
    render(
      <ReceivedDocumentVerificationSummary
        documents={[
          {
            id: "doc-1",
            shipmentId: "ship-1",
            docType: "passport",
            receiveVerifiedAt: "2026-07-14T10:00:00.000Z",
            receiveRemarks: "Seal intact",
          },
          {
            id: "doc-2",
            shipmentId: "ship-1",
            docType: "degree_certificate_original",
            receiveRemarks: "Not arrived, please check Kochi office",
          },
        ]}
      />,
    );

    expect(screen.getByText("Receipt cross-check")).toBeInTheDocument();
    expect(screen.getByText("Arrived")).toBeInTheDocument();
    expect(screen.getByText("Not arrived")).toBeInTheDocument();
    expect(screen.getByText("Seal intact")).toBeInTheDocument();
    expect(
      screen.getByText("Not arrived, please check Kochi office"),
    ).toBeInTheDocument();
  });

  it("renders nothing when no documents were reviewed", () => {
    const { container } = render(
      <ReceivedDocumentVerificationSummary
        documents={[
          {
            id: "doc-1",
            shipmentId: "ship-1",
            docType: "passport",
          },
        ]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

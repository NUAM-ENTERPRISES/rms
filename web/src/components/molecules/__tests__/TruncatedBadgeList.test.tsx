import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  DocumentTypeTruncatedBadges,
  TruncatedBadgeList,
} from "@/components/molecules/TruncatedBadgeList";

describe("TruncatedBadgeList", () => {
  const items = Array.from({ length: 8 }, (_, index) => ({
    key: `item-${index}`,
    label: `Document ${index + 1}`,
  }));

  it("renders only maxVisible badges and a more indicator", () => {
    render(<TruncatedBadgeList items={items} maxVisible={3} />);

    expect(screen.getByText("Document 1")).toBeInTheDocument();
    expect(screen.getByText("Document 2")).toBeInTheDocument();
    expect(screen.getByText("Document 3")).toBeInTheDocument();
    expect(screen.queryByText("Document 4")).not.toBeInTheDocument();
    expect(screen.getByText("+5 more")).toBeInTheDocument();
  });

  it("shows all items in tooltip on hover with total count", async () => {
    const user = userEvent.setup();
    render(
      <TruncatedBadgeList
        items={items}
        maxVisible={3}
        tooltipLabel="All documents"
      />,
    );

    await user.hover(screen.getByText("+5 more"));

    expect(
      await screen.findByText("All documents (8)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Document 8")).toBeInTheDocument();
  });

  it("renders empty label when there are no items", () => {
    render(<TruncatedBadgeList items={[]} emptyLabel="No documents" />);
    expect(screen.getByText("No documents")).toBeInTheDocument();
  });
});

describe("DocumentTypeTruncatedBadges", () => {
  it("maps document type codes to display names", () => {
    render(
      <DocumentTypeTruncatedBadges
        docTypes={["passport_original", "degree_certificate_original"]}
        maxVisible={2}
      />,
    );

    expect(screen.getByText("Original Passport (presented)")).toBeInTheDocument();
    expect(
      screen.getByText("Degree Certificate (Original)"),
    ).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionSourceDetail } from "../CollectionSourceDetail";

describe("CollectionSourceDetail", () => {
  it("renders courier tracking link when partner and tracking number exist", () => {
    render(
      <CollectionSourceDetail
        collection={{
          collectionType: "courier",
          courierPartner: "Delhivery",
          trackingNumber: "DEL123",
        }}
      />,
    );

    expect(screen.getByText("Delhivery")).toBeInTheDocument();
    expect(screen.getByText("DEL123")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Track shipment on Delhivery (opens in new tab)",
      }),
    ).toHaveAttribute(
      "href",
      "https://www.delhivery.com/track/package/DEL123",
    );
  });

  it("renders plain text for non-courier collection types", () => {
    render(
      <CollectionSourceDetail
        collection={{
          collectionType: "agent",
          agent: { name: "Global Agent" },
        }}
      />,
    );

    expect(screen.getByText("Global Agent")).toBeInTheDocument();
  });
});

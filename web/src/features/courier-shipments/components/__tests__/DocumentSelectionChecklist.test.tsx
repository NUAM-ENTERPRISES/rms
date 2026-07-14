import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentSelectionChecklist } from "../DocumentSelectionChecklist";

describe("DocumentSelectionChecklist", () => {
  it("shows destination and arrived badges for shipped documents", () => {
    render(
      <DocumentSelectionChecklist
        availableDocTypes={["passport", "sslc_certificate_original"]}
        selected={[]}
        onChange={vi.fn()}
        movements={{
          passport: {
            status: "received",
            toAddressLabel: "Delhi Office",
            legNumber: 1,
          },
        }}
      />,
    );

    expect(screen.getByText("Arrived")).toBeInTheDocument();
    expect(screen.getByText("Delhi Office")).toBeInTheDocument();
    expect(
      screen.getByText("Leg 1 · Arrived at Delhi Office"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 already shipped")).toBeInTheDocument();
    expect(screen.getByText("Received")).toBeInTheDocument();
  });

  it("shows in transit badge when movement is in transit", () => {
    render(
      <DocumentSelectionChecklist
        availableDocTypes={["passport"]}
        selected={[]}
        onChange={vi.fn()}
        movements={{
          passport: {
            status: "in_transit",
            toAddressLabel: "Delhi Office",
            legNumber: 2,
          },
        }}
      />,
    );

    expect(screen.getByText("In transit")).toBeInTheDocument();
    expect(
      screen.getByText("Leg 2 · In transit to Delhi Office"),
    ).toBeInTheDocument();
  });

  it("keeps shipped documents selectable", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DocumentSelectionChecklist
        availableDocTypes={["passport"]}
        selected={[]}
        onChange={onChange}
        movements={{
          passport: {
            status: "received",
            toAddressLabel: "Delhi Office",
            legNumber: 1,
          },
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /passport|Passport/i }),
    );

    expect(onChange).toHaveBeenCalledWith(["passport"]);
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  buildDefaultChecklistItems,
  OriginalDocumentChecklist,
} from "../components/OriginalDocumentChecklist";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe("OriginalDocumentChecklist", () => {
  it("disables and badges previously received document types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const items = buildDefaultChecklistItems();

    render(
      <OriginalDocumentChecklist
        items={items}
        onChange={onChange}
        previouslyReceivedDocTypes={["degree_certificate_original"]}
      />,
    );

    expect(screen.getByText("Previously received")).toBeInTheDocument();
    expect(screen.getByText(/1 previously received/)).toBeInTheDocument();

    const degreeCheckbox = screen.getByRole("checkbox", {
      name: /degree certificate/i,
    });
    expect(degreeCheckbox).toBeDisabled();
    expect(degreeCheckbox).toBeChecked();

    const sslcCheckbox = screen.getByRole("checkbox", {
      name: /sslc/i,
    });
    expect(sslcCheckbox).not.toBeDisabled();
    await user.click(sslcCheckbox);
    expect(onChange).toHaveBeenCalled();
  });
});

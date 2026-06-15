import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  buildDefaultChecklistItems,
  OriginalDocumentChecklist,
} from "../components/OriginalDocumentChecklist";
import { ORIGINAL_DOCUMENT_CHECKLIST } from "../constants";

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

    expect(screen.getByText("On file")).toBeInTheDocument();
    expect(screen.getByText(/1 already on file/)).toBeInTheDocument();
    expect(screen.getByText("Degree Certificate (Original)")).toBeInTheDocument();

    const sslcCheckbox = screen.getByRole("checkbox", {
      name: /sslc/i,
    });
    expect(sslcCheckbox).not.toBeDisabled();
    await user.click(sslcCheckbox);
    expect(onChange).toHaveBeenCalled();
  });

  it("selects and clears all selectable documents", async () => {
    const user = userEvent.setup();

    function ControlledChecklist() {
      const [items, setItems] = useState(buildDefaultChecklistItems());
      return (
        <OriginalDocumentChecklist items={items} onChange={setItems} />
      );
    }

    render(<ControlledChecklist />);

    const selectAll = screen.getByRole("checkbox", {
      name: /select all documents/i,
    });
    expect(selectAll).not.toBeChecked();

    await user.click(selectAll);
    expect(selectAll).toBeChecked();

    await user.click(selectAll);
    expect(selectAll).not.toBeChecked();
  });

  it("does not toggle locked documents when using select all", async () => {
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

    await user.click(
      screen.getByRole("checkbox", { name: /select all documents/i }),
    );

    const next = onChange.mock.calls[0][0] as typeof items;
    const degree = next.find(
      (item) => item.docType === "degree_certificate_original",
    );
    expect(degree?.isReceived).toBe(false);
    expect(
      next.filter((item) => item.isReceived).length,
    ).toBe(ORIGINAL_DOCUMENT_CHECKLIST.length - 1);
  });
});

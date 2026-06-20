import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { IntroductionVideoUploadModal } from "./IntroductionVideoUploadModal";

describe("IntroductionVideoUploadModal", () => {
  it("submits file and remarks", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <IntroductionVideoUploadModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    const fileInput = screen.getByLabelText("Video file");
    const file = new File(["video"], "intro.mp4", { type: "video/mp4" });
    await user.upload(fileInput, file);
    await user.type(
      screen.getByLabelText("Remarks"),
      "Recorded in studio"
    );
    await user.click(screen.getByRole("button", { name: "Upload" }));

    expect(onSubmit).toHaveBeenCalledWith({
      file,
      remarks: "Recorded in studio",
    });
  });
});

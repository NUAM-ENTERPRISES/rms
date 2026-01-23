import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { ImageViewer } from "@/components/molecules";

describe("ImageViewer", () => {
  it("renders initials fallback when no src provided and opens dialog on click", async () => {
    render(<ImageViewer title="Jane Doe" src={undefined} fallbackSrc={undefined} />);

    const avatar = screen.getByRole("button", { name: /view full image for jane doe/i });
    expect(avatar).toBeInTheDocument();

    // initials shown in fallback (may exist in multiple places: avatar + preview)
    const initials = screen.getAllByText("JD");
    expect(initials.length).toBeGreaterThan(0);

    await userEvent.click(avatar);

    // dialog title appears
    expect(await screen.findByRole("heading", { name: /jane doe/i })).toBeInTheDocument();
  });

  it("shows image preview and full image when src provided", async () => {
    const src = "https://example.com/photo.jpg";
    render(<ImageViewer title="John Appleseed" src={src} fallbackSrc={undefined} />);

    const avatar = screen.getByRole("button", { name: /view full image for john appleseed/i });
    await userEvent.click(avatar);

    const img = await screen.findByAltText(/^John Appleseed$/i);
    expect(img).toHaveAttribute("src", src);
    // dialog image has intrinsic dimensions to avoid layout shift
    expect(img).toHaveAttribute("width");
    expect(img).toHaveAttribute("height");
  });

  it("positions hover preview on the left when hoverPosition='left'", async () => {
    const src = "https://example.com/photo.jpg";
    render(<ImageViewer title="Left Test" src={src} hoverPosition="left" />);

    const avatar = screen.getByRole("button", { name: /view full image for left test/i });
    await userEvent.hover(avatar);

    const preview = await screen.findByAltText(/left test preview/i);
    expect(preview.parentElement).toHaveClass("right-full");
  });
});

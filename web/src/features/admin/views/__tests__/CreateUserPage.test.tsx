import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CreateUserPage from "../CreateUserPage";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/hooks/useCan", () => ({
  useCan: vi.fn(() => true),
  useHasRole: vi.fn(() => true),
}));

vi.mock("@/components/molecules", () => ({
  CountryCodeSelect: () => <div data-testid="country-code-select" />,
  RoleSelect: (props: any) => (
    <div>
      <button
        type="button"
        data-testid="role-select"
        data-error={props.error ?? ""}
        onClick={() => props.onValueChange?.("r-recruiter")}
      >
        Select Recruiter
      </button>
      <button
        type="button"
        data-testid="role-select-exec"
        onClick={() => props.onValueChange?.("r-recruitment-exec")}
      >
        Select Recruitment Executive
      </button>
      <button
        type="button"
        data-testid="role-select-lead"
        onClick={() => props.onValueChange?.("r-lead")}
      >
        Select Recruitment Lead
      </button>
    </div>
  ),
  ProfileImageUpload: () => <div data-testid="profile-image-upload" />,
  PhysicalAddressFields: () => <div data-testid="physical-address-fields" />,
  ProfessionTypeMultiSelect: () => <div data-testid="profession-type-select" />,
}));

vi.mock("@/features/admin/components/RecruiterCapabilitiesFormCard", () => ({
  RecruiterCapabilitiesFormCard: () => (
    <div data-testid="recruiter-capabilities-card" />
  ),
}));

vi.mock("@/services/uploadApi", () => ({
  useUploadUserProfileImageMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));

vi.mock("@/features/admin/api", () => ({
  useCreateUserMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetRolesQuery: vi.fn(() => ({
    data: {
      success: true,
      data: {
        roles: [
          { id: "r1", name: "Manager", isSystem: true, permissions: [] },
          { id: "r-recruiter", name: "Recruiter", isSystem: true, permissions: [] },
          {
            id: "r-recruitment-exec",
            name: "Recruitment Executive",
            isSystem: true,
            permissions: [],
          },
          {
            id: "r-lead",
            name: "Recruitment Lead",
            isSystem: true,
            permissions: [],
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        counts: { all: 1, system: 1, custom: 0 },
      },
      message: "ok",
    },
    isLoading: false,
  })),
  useListUserLanguagesQuery: vi.fn(() => ({ data: { data: [] } })),
  useUpdateRecruiterCapabilitiesMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));

import { useGetRolesQuery } from "@/features/admin/api";

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateUserPage />
    </MemoryRouter>,
  );
}

describe("CreateUserPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show role validation error on initial load", () => {
    renderPage();
    expect(screen.queryByText(/role is required/i)).not.toBeInTheDocument();
  });

  it("does not show Suggest employee code button", () => {
    renderPage();
    expect(
      screen.queryByRole("button", { name: /suggest/i }),
    ).not.toBeInTheDocument();
  });

  it("fetches roles from paginated roles API with system filter", () => {
    renderPage();
    expect(useGetRolesQuery).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
      type: "SYSTEM",
      search: undefined,
    });
  });

  it("shows Recruiter sector scope after selecting Recruiter role", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("role-select"));
    expect(
      await screen.findByText((_, el) =>
        Boolean(
          el?.tagName === "LABEL" &&
            /Recruiter sector scope/i.test(el.textContent ?? ""),
        ),
      ),
    ).toBeInTheDocument();
  });

  it("shows Recruiter sector scope after selecting Recruitment Executive role", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("role-select-exec"));
    expect(
      await screen.findByText((_, el) =>
        Boolean(
          el?.tagName === "LABEL" &&
            /Recruiter sector scope/i.test(el.textContent ?? ""),
        ),
      ),
    ).toBeInTheDocument();
  });

  it("does not show recruiter capabilities after selecting Recruitment Lead", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("role-select-lead"));
    expect(
      screen.queryByText((_, el) =>
        Boolean(
          el?.tagName === "LABEL" &&
            /Recruiter sector scope/i.test(el.textContent ?? ""),
        ),
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("recruiter-capabilities-card"),
    ).not.toBeInTheDocument();
  });
});


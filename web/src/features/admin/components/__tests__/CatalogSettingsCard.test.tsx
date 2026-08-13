import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogSettingsCard } from "../CatalogSettingsCard";

vi.mock("@/hooks/useCan", () => ({
  useCan: vi.fn(),
}));

vi.mock("@/features/projects", () => ({
  useGetRoleDepartmentsQuery: vi.fn(),
}));

vi.mock("../../api/catalogSettingsApi", () => ({
  useGetAdminProfessionTypesQuery: vi.fn(),
  useGetAdminRoleCatalogQuery: vi.fn(),
  useGetAdminQualificationsQuery: vi.fn(),
  useCreateProfessionTypeMutation: vi.fn(),
  useUpdateProfessionTypeMutation: vi.fn(),
  useSoftDeleteProfessionTypeMutation: vi.fn(),
  useCreateRoleDepartmentMutation: vi.fn(),
  useUpdateRoleDepartmentMutation: vi.fn(),
  useSoftDeleteRoleDepartmentMutation: vi.fn(),
  useCreateRoleCatalogMutation: vi.fn(),
  useUpdateRoleCatalogMutation: vi.fn(),
  useSoftDeleteRoleCatalogMutation: vi.fn(),
  useCreateQualificationMutation: vi.fn(),
  useUpdateQualificationMutation: vi.fn(),
  useSoftDeleteQualificationMutation: vi.fn(),
}));

import { useCan } from "@/hooks/useCan";
import { useGetRoleDepartmentsQuery } from "@/features/projects";
import {
  useGetAdminProfessionTypesQuery,
  useGetAdminQualificationsQuery,
  useGetAdminRoleCatalogQuery,
  useCreateProfessionTypeMutation,
  useUpdateProfessionTypeMutation,
  useSoftDeleteProfessionTypeMutation,
  useCreateRoleDepartmentMutation,
  useUpdateRoleDepartmentMutation,
  useSoftDeleteRoleDepartmentMutation,
  useCreateRoleCatalogMutation,
  useUpdateRoleCatalogMutation,
  useSoftDeleteRoleCatalogMutation,
  useCreateQualificationMutation,
  useUpdateQualificationMutation,
  useSoftDeleteQualificationMutation,
} from "../../api/catalogSettingsApi";

const mockCreateRole = vi.fn();

describe("CatalogSettingsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGetAdminProfessionTypesQuery).mockReturnValue({
      data: {
        professionTypes: [
          {
            id: "pt-nurse",
            name: "nurse",
            label: "Nurse",
            sector: "HEALTHCARE",
            isActive: true,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    } as never);

    vi.mocked(useGetRoleDepartmentsQuery).mockReturnValue({
      data: {
        data: {
          departments: [
            {
              id: "dept-er",
              name: "emergency",
              label: "Emergency Department",
              isActive: true,
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      },
      isLoading: false,
      isFetching: false,
    } as never);

    vi.mocked(useGetAdminRoleCatalogQuery).mockReturnValue({
      data: {
        roles: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
    } as never);

    vi.mocked(useGetAdminQualificationsQuery).mockReturnValue({
      data: {
        qualifications: [
          {
            id: "qual-bsc",
            name: "Bachelor of Science in Nursing (BSc Nursing)",
            shortName: "BSc Nursing",
            level: "BACHELOR",
            field: "Nursing",
            isActive: true,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    } as never);

    const idleMutation = [vi.fn(), { isLoading: false }] as never;
    vi.mocked(useCreateProfessionTypeMutation).mockReturnValue(idleMutation);
    vi.mocked(useUpdateProfessionTypeMutation).mockReturnValue(idleMutation);
    vi.mocked(useSoftDeleteProfessionTypeMutation).mockReturnValue(idleMutation);
    vi.mocked(useCreateRoleDepartmentMutation).mockReturnValue(idleMutation);
    vi.mocked(useUpdateRoleDepartmentMutation).mockReturnValue(idleMutation);
    vi.mocked(useSoftDeleteRoleDepartmentMutation).mockReturnValue(idleMutation);
    vi.mocked(useUpdateRoleCatalogMutation).mockReturnValue(idleMutation);
    vi.mocked(useSoftDeleteRoleCatalogMutation).mockReturnValue(idleMutation);
    vi.mocked(useCreateQualificationMutation).mockReturnValue(idleMutation);
    vi.mocked(useUpdateQualificationMutation).mockReturnValue(idleMutation);
    vi.mocked(useSoftDeleteQualificationMutation).mockReturnValue(idleMutation);

    mockCreateRole.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    vi.mocked(useCreateRoleCatalogMutation).mockReturnValue([
      mockCreateRole,
      { isLoading: false },
    ] as never);
  });

  it("hides create buttons without manage:system_config", () => {
    vi.mocked(useCan).mockReturnValue(false);

    render(<CatalogSettingsCard />);

    expect(
      screen.queryByRole("button", { name: /add profession/i }),
    ).not.toBeInTheDocument();
  });

  it("shows profession picker when creating a role", async () => {
    const user = userEvent.setup();
    vi.mocked(useCan).mockReturnValue(true);

    render(<CatalogSettingsCard />);

    await user.click(screen.getByRole("tab", { name: /roles/i }));
    await user.click(screen.getByRole("button", { name: /add role/i }));

    expect(screen.getByText(/^profession type$/i)).toBeInTheDocument();
    expect(screen.getByText(/^department$/i)).toBeInTheDocument();
  });

  it("submits role create payload including optional professionTypeId field", async () => {
    const user = userEvent.setup();
    vi.mocked(useCan).mockReturnValue(true);

    render(<CatalogSettingsCard />);

    await user.click(screen.getByRole("tab", { name: /roles/i }));
    await user.click(screen.getByRole("button", { name: /add role/i }));

    await user.type(
      screen.getByRole("textbox", { name: /^label/i }),
      "Emergency Staff Nurse",
    );

    expect(screen.getByRole("textbox", { name: /name \(slug\)/i })).toHaveValue(
      "emergency_staff_nurse",
    );
    expect(screen.getByRole("textbox", { name: /short name/i })).toHaveValue(
      "EME",
    );

    await user.click(screen.getByRole("button", { name: /create role/i }));

    expect(mockCreateRole).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "emergency_staff_nurse",
        label: "Emergency Staff Nurse",
        shortName: "EME",
        professionTypeId: null,
        roleDepartmentId: null,
      }),
    );
  });

  it("requests departments and roles with page size 10", async () => {
    const user = userEvent.setup();
    vi.mocked(useCan).mockReturnValue(true);

    render(<CatalogSettingsCard />);

    await user.click(screen.getByRole("tab", { name: /departments/i }));
    expect(useGetRoleDepartmentsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ includeRoles: false, page: 1, limit: 10 }),
    );

    await user.click(screen.getByRole("tab", { name: /roles/i }));
    expect(useGetAdminRoleCatalogQuery).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
    );
  });

  it("shows department pagination summary", async () => {
    const user = userEvent.setup();
    vi.mocked(useCan).mockReturnValue(true);

    render(<CatalogSettingsCard />);
    await user.click(screen.getByRole("tab", { name: /departments/i }));

    expect(screen.getByText(/showing/i)).toBeInTheDocument();
    expect(screen.getByText(/page 1 \/ 1/i)).toBeInTheDocument();
  });

  it("shows profession sector filter and search", () => {
    vi.mocked(useCan).mockReturnValue(true);

    render(<CatalogSettingsCard />);

    expect(screen.getByLabelText(/search professions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by sector/i)).toBeInTheDocument();
  });

  it("shows role search, sector, and profession filters", async () => {
    const user = userEvent.setup();
    vi.mocked(useCan).mockReturnValue(true);

    render(<CatalogSettingsCard />);
    await user.click(screen.getByRole("tab", { name: /roles/i }));

    expect(screen.getByLabelText(/search roles/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by sector/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/filter by profession type/i),
    ).toBeInTheDocument();
  });

  it("shows add qualification with manage:qualifications even without manage:system_config", async () => {
    const user = userEvent.setup();
    vi.mocked(useCan).mockImplementation(
      (permission) => permission === "manage:qualifications",
    );

    render(<CatalogSettingsCard />);

    expect(
      screen.queryByRole("button", { name: /add profession/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /qualifications/i }));
    expect(
      screen.getByRole("button", { name: /add qualification/i }),
    ).toBeInTheDocument();
  });

  it("hides add qualification without manage:qualifications", async () => {
    const user = userEvent.setup();
    vi.mocked(useCan).mockReturnValue(false);

    render(<CatalogSettingsCard />);
    await user.click(screen.getByRole("tab", { name: /qualifications/i }));

    expect(
      screen.queryByRole("button", { name: /add qualification/i }),
    ).not.toBeInTheDocument();
  });

  it("uses side scroll on catalog tabs and the settings panel", () => {
    vi.mocked(useCan).mockReturnValue(true);
    const { container } = render(<CatalogSettingsCard />);

    expect(container.querySelector(".overflow-x-auto")).toBeTruthy();
    expect(container.querySelector(".overflow-y-auto")).toBeTruthy();
  });

  it("opens delete confirmation for a profession type", async () => {
    const user = userEvent.setup();
    vi.mocked(useCan).mockReturnValue(true);

    render(<CatalogSettingsCard />);

    await user.click(screen.getByRole("button", { name: /delete nurse/i }));
    expect(screen.getByText(/delete profession type/i)).toBeInTheDocument();
    expect(
      screen.getByText(/soft-deleted \(marked inactive\)/i),
    ).toBeInTheDocument();
  });
});

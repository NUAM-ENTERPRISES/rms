import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TemplateCard } from "../components/TemplateCard";
import type { MockInterviewChecklistTemplate } from "../../types";

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div onClick={onClick}>{children}</div>
  ),
}));

describe("TemplateCard", () => {
  const mockTemplate: MockInterviewChecklistTemplate = {
    id: "template-1",
    roleId: "role-1",
    category: "technical_skills",
    criterion: "Demonstrates strong problem-solving skills",
    order: 1,
    isActive: true,
    createdAt: "2024-11-24T00:00:00Z",
    updatedAt: "2024-11-24T00:00:00Z",
    role: {
      id: "role-1",
      designation: "Registered Nurse",
      slug: "registered-nurse",
    },
  };

  it("renders template information correctly", () => {
    render(
      <TemplateCard template={mockTemplate} canEdit={false} canDelete={false} />
    );

    expect(
      screen.getByText("Demonstrates strong problem-solving skills")
    ).toBeInTheDocument();
    expect(screen.getByText("Registered Nurse")).toBeInTheDocument();
    expect(screen.getByText("Order: 1")).toBeInTheDocument();
  });

  it("displays category badge with correct label", () => {
    render(
      <TemplateCard template={mockTemplate} canEdit={false} canDelete={false} />
    );

    expect(screen.getByText("Technical Skills")).toBeInTheDocument();
  });

  it("shows inactive badge when template is inactive", () => {
    const inactiveTemplate = { ...mockTemplate, isActive: false };
    render(
      <TemplateCard
        template={inactiveTemplate}
        canEdit={false}
        canDelete={false}
      />
    );

    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("does not show inactive badge when template is active", () => {
    render(
      <TemplateCard template={mockTemplate} canEdit={false} canDelete={false} />
    );

    expect(screen.queryByText("Inactive")).not.toBeInTheDocument();
  });

  it("calls onEdit when edit is clicked and user has edit permission", () => {
    const onEdit = vi.fn();
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={onEdit}
        canEdit={true}
        canDelete={false}
      />
    );

    const editButton = screen.getByText("Edit");
    editButton.click();

    expect(onEdit).toHaveBeenCalledWith(mockTemplate);
  });

  it("calls onDelete when delete is clicked and user has delete permission", () => {
    const onDelete = vi.fn();
    render(
      <TemplateCard
        template={mockTemplate}
        onDelete={onDelete}
        canEdit={false}
        canDelete={true}
      />
    );

    const deleteButton = screen.getByText("Delete");
    deleteButton.click();

    expect(onDelete).toHaveBeenCalledWith(mockTemplate.id);
  });
});

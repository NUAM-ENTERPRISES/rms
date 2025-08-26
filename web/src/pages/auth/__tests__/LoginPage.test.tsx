import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { BrowserRouter } from "react-router-dom";
import LoginPage from "@/pages/auth/LoginPage";

// Mock the router
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Wrapper component for tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={configureStore({ reducer: { auth: () => ({}) } })}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form with all required elements", () => {
    render(<LoginPage />, { wrapper: TestWrapper });

    // Check for logo
    expect(screen.getByAltText("Affiniks RMS")).toBeInTheDocument();

    // Check for headings
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(
      screen.getByText("Sign in to your Affiniks RMS account")
    ).toBeInTheDocument();

    // Check for form fields
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();

    // Check for submit button
    expect(
      screen.getByRole("button", { name: "Sign in to dashboard" })
    ).toBeInTheDocument();

    // Check for additional actions
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Request access" })
    ).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    render(<LoginPage />, { wrapper: TestWrapper });

    const passwordInput = screen.getByLabelText("Password");
    const toggleButton = screen.getByRole("button", { name: "" });

    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle button
    fireEvent.click(toggleButton);

    // Password should be visible
    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("has proper accessibility attributes", () => {
    render(<LoginPage />, { wrapper: TestWrapper });

    const emailInput = screen.getByLabelText("Email address");
    const passwordInput = screen.getByLabelText("Password");

    // Check for proper labels
    expect(emailInput).toHaveAttribute("id", "email");
    expect(passwordInput).toHaveAttribute("id", "password");

    // Check for proper types
    expect(emailInput).toHaveAttribute("type", "email");
    expect(passwordInput).toHaveAttribute("type", "password");

    // Check for placeholders
    expect(emailInput).toHaveAttribute("placeholder", "Enter your email");
    expect(passwordInput).toHaveAttribute("placeholder", "Enter your password");
  });

  it("allows form input", () => {
    render(<LoginPage />, { wrapper: TestWrapper });

    const emailInput = screen.getByLabelText("Email address");
    const passwordInput = screen.getByLabelText("Password");

    // Test email input
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    expect(emailInput).toHaveValue("test@example.com");

    // Test password input
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    expect(passwordInput).toHaveValue("password123");
  });

  it("renders branding content in DOM", () => {
    render(<LoginPage />, { wrapper: TestWrapper });

    // Check for branding content using more flexible text matching
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(
      screen.getByText("Sign in to your Affiniks RMS account")
    ).toBeInTheDocument();
  });

  it("has proper form structure", () => {
    render(<LoginPage />, { wrapper: TestWrapper });

    // Check that form element exists (using querySelector since it doesn't have a role)
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();

    // Check that form has email and password inputs
    const emailInput = screen.getByLabelText("Email address");
    const passwordInput = screen.getByLabelText("Password");
    expect(form).toContainElement(emailInput);
    expect(form).toContainElement(passwordInput);
  });
});

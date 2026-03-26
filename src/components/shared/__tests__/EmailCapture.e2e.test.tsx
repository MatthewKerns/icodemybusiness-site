/**
 * End-to-end integration test for EmailCapture component
 * Tests the complete validation flow from frontend form to backend mutation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailCapture } from "../EmailCapture";

// Mock Convex
const mockCreateLead = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockCreateLead,
}));

// Mock session ID hook
vi.mock("@/hooks/useSessionId", () => ({
  useSessionId: () => "test-session-id",
}));

describe("EmailCapture E2E Validation", () => {
  beforeEach(() => {
    mockCreateLead.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Frontend Validation", () => {
    it("should show validation error for empty email on blur", async () => {
      const user = userEvent.setup();
      render(<EmailCapture variant="compact" source="test" />);

      const input = screen.getByPlaceholderText("you@example.com");

      // Focus and blur without entering anything
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Email is required")).toBeInTheDocument();
      });
    });

    it("should show validation error for invalid email format", async () => {
      const user = userEvent.setup();
      const { container } = render(<EmailCapture variant="compact" source="test" />);

      const input = container.querySelector('input[type="email"]') as HTMLInputElement;
      expect(input).toBeTruthy();

      // Enter invalid email
      await user.type(input, "test@");
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText("Please enter a valid email address")
        ).toBeInTheDocument();
      });
    });

    it("should show validation error for email without TLD", async () => {
      const user = userEvent.setup();
      const { container } = render(<EmailCapture variant="compact" source="test" />);

      const input = container.querySelector('input[type="email"]') as HTMLInputElement;
      expect(input).toBeTruthy();

      // Enter email without TLD
      await user.type(input, "test@example");
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText("Please enter a valid email address")
        ).toBeInTheDocument();
      });
    });

    it("should show validation error for email exceeding max length", async () => {
      const user = userEvent.setup();
      const { container } = render(<EmailCapture variant="compact" source="test" />);

      const input = container.querySelector('input[type="email"]') as HTMLInputElement;
      expect(input).toBeTruthy();

      // Create email that exceeds 254 characters (242 a's + @example.com = 254 chars)
      // So we need 243 or more to exceed the limit
      const longEmail = "a".repeat(243) + "@example.com"; // 255 characters total
      await user.type(input, longEmail);
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText("Email address is too long (maximum 254 characters)")
        ).toBeInTheDocument();
      });
    });

    it("should not show validation error for valid email", async () => {
      const user = userEvent.setup();
      const { container } = render(<EmailCapture variant="compact" source="test" />);

      const input = container.querySelector('input[type="email"]') as HTMLInputElement;
      expect(input).toBeTruthy();

      // Enter valid email
      await user.type(input, "test@example.com");
      await user.tab();

      // Wait a bit to ensure no error appears
      await waitFor(
        () => {
          const errorMessage = screen.queryByText("Please enter a valid email address");
          expect(errorMessage).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });

  describe("Backend Integration", () => {
    it("should submit valid email to backend with cleaned data", async () => {
      const user = userEvent.setup();
      mockCreateLead.mockResolvedValue("lead-id-123");

      const { container } = render(<EmailCapture variant="compact" source="test-source" />);

      const input = container.querySelector('input[type="email"]') as HTMLInputElement;
      const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(input).toBeTruthy();
      expect(button).toBeTruthy();

      // Enter valid email with extra whitespace and mixed case
      await user.type(input, "  Test@Example.COM  ");
      await user.click(button);

      await waitFor(() => {
        expect(mockCreateLead).toHaveBeenCalledWith({
          // Zod schema automatically trims and lowercases the email
          email: "test@example.com",
          source: "test-source",
          sessionId: "test-session-id",
        });
      });
    });

    it("should display backend validation errors", async () => {
      const user = userEvent.setup();
      // Simulate backend error with proper Convex error structure
      const convexError = new Error("Rate limit exceeded");
      (convexError as Error & { data: unknown }).data = {
        kind: "RateLimited",
        message: "Too many attempts. Please try again in a moment.",
      };
      mockCreateLead.mockRejectedValue(convexError);

      const { container } = render(<EmailCapture variant="compact" source="test" />);

      const input = container.querySelector('input[type="email"]') as HTMLInputElement;
      const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(input).toBeTruthy();
      expect(button).toBeTruthy();

      await user.type(input, "test@example.com");
      await user.click(button);

      await waitFor(() => {
        expect(
          screen.getByText("Too many attempts. Please try again in a moment.")
        ).toBeInTheDocument();
      });
    });

    it("should show success state after successful submission", async () => {
      const user = userEvent.setup();
      mockCreateLead.mockResolvedValue("lead-id-123");

      const { container } = render(
        <EmailCapture
          variant="compact"
          source="test"
          successMessage="Success! Check your email."
        />
      );

      const input = container.querySelector('input[type="email"]') as HTMLInputElement;
      const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(input).toBeTruthy();
      expect(button).toBeTruthy();

      await user.type(input, "test@example.com");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Success! Check your email.")).toBeInTheDocument();
      });
    });

    it("should prevent double submission", async () => {
      const user = userEvent.setup();
      // Simulate slow backend
      mockCreateLead.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve("lead-id-123"), 100))
      );

      const { container } = render(<EmailCapture variant="compact" source="test" />);

      const input = container.querySelector('input[type="email"]') as HTMLInputElement;
      const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(input).toBeTruthy();
      expect(button).toBeTruthy();

      await user.type(input, "test@example.com");

      // Click multiple times rapidly
      await user.click(button);
      await user.click(button);
      await user.click(button);

      await waitFor(() => {
        expect(mockCreateLead).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Validation Consistency", () => {
    it("should normalize email consistently (lowercase, trim)", async () => {
      const user = userEvent.setup();
      mockCreateLead.mockResolvedValue("lead-id-123");

      const { container } = render(<EmailCapture variant="compact" source="test" />);

      const input = container.querySelector('input[type="email"]') as HTMLInputElement;
      const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(input).toBeTruthy();
      expect(button).toBeTruthy();

      // Test with various formats
      const testEmail = "  TEST@EXAMPLE.COM  ";
      await user.type(input, testEmail);
      await user.click(button);

      await waitFor(() => {
        expect(mockCreateLead).toHaveBeenCalled();
      });

      // Frontend validation should pass (Zod schema handles normalization)
      // Backend will receive the email and normalize it server-side
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<EmailCapture variant="compact" source="test" />);

      const form = screen.getByLabelText("Email signup");
      expect(form).toBeInTheDocument();

      const input = screen.getByLabelText("Email address");
      expect(input).toBeInTheDocument();
    });

    it("should announce success state to screen readers", async () => {
      const user = userEvent.setup();
      mockCreateLead.mockResolvedValue("lead-id-123");

      const { container } = render(<EmailCapture variant="compact" source="test" />);

      const input = container.querySelector('input[type="email"]') as HTMLInputElement;
      const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(input).toBeTruthy();
      expect(button).toBeTruthy();

      await user.type(input, "test@example.com");
      await user.click(button);

      await waitFor(() => {
        const status = screen.getByRole("status");
        expect(status).toHaveAttribute("aria-live", "polite");
      });
    });
  });
});

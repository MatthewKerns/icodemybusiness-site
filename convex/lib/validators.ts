import { ConvexError } from "convex/values";

/**
 * Email validation following RFC 5321 standards.
 * Validates email format and length (max 254 characters).
 *
 * @param email - The email address to validate
 * @returns The normalized email (trimmed and lowercased)
 * @throws ConvexError if email is invalid
 */
export function validateEmail(email: string): string {
  const normalized = email.trim().toLowerCase();

  // Check length (RFC 5321 max is 254 characters)
  if (normalized.length === 0) {
    throw new ConvexError("Email is required");
  }

  if (normalized.length > 254) {
    throw new ConvexError("Email address is too long (maximum 254 characters)");
  }

  // Email regex pattern matching frontend validation
  // Pattern: local@domain.tld
  // - local part: any chars except whitespace and @
  // - @ symbol
  // - domain: any chars except whitespace and @
  // - dot
  // - TLD: at least 2 characters
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (!emailRegex.test(normalized)) {
    throw new ConvexError("Please enter a valid email address");
  }

  return normalized;
}

/**
 * Phone number validation following E.164 format.
 * E.164 format: +[country code][subscriber number] (max 15 digits)
 * Example: +14155552671
 *
 * @param phone - The phone number to validate
 * @returns The normalized phone (trimmed)
 * @throws ConvexError if phone is invalid
 */
export function validatePhone(phone: string): string {
  const normalized = phone.trim();

  if (normalized.length === 0) {
    throw new ConvexError("Phone number is required");
  }

  // E.164 format: + followed by country code (1-3 digits) and subscriber number
  // Total: 1 to 15 digits after the +
  const phoneRegex = /^\+[1-9]\d{1,14}$/;

  if (!phoneRegex.test(normalized)) {
    throw new ConvexError(
      "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
    );
  }

  return normalized;
}

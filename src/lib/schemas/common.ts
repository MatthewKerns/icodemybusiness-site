import { z } from "zod";

/**
 * Email validation schema following RFC 5321 (max 254 characters).
 * Provides clear error messages for common validation failures.
 */
export const emailSchema = z
  .string({
    required_error: "Email is required",
    invalid_type_error: "Email must be a string",
  })
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(254, "Email address is too long (maximum 254 characters)")
  .toLowerCase()
  .trim();

/**
 * Phone number validation schema following E.164 format.
 * E.164 format: +[country code][subscriber number] (max 15 digits)
 * Example: +14155552671
 */
export const phoneSchema = z
  .string({
    required_error: "Phone number is required",
    invalid_type_error: "Phone number must be a string",
  })
  .min(1, "Phone number is required")
  .regex(
    /^\+[1-9]\d{1,14}$/,
    "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
  )
  .trim();

/**
 * Optional phone number schema that allows empty strings or undefined.
 */
export const phoneSchemaOptional = z
  .string()
  .regex(
    /^\+[1-9]\d{1,14}$/,
    "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
  )
  .trim()
  .optional()
  .or(z.literal(""));

/**
 * URL validation schema with protocol requirement.
 * Ensures URLs are valid and include a protocol (http:// or https://).
 */
export const urlSchema = z
  .string({
    required_error: "URL is required",
    invalid_type_error: "URL must be a string",
  })
  .min(1, "URL is required")
  .url("Please enter a valid URL (e.g., https://example.com)")
  .trim();

/**
 * Optional URL schema that allows empty strings or undefined.
 */
export const urlSchemaOptional = z
  .string()
  .url("Please enter a valid URL (e.g., https://example.com)")
  .trim()
  .optional()
  .or(z.literal(""));

/**
 * Type exports for use in components and functions.
 */
export type Email = z.infer<typeof emailSchema>;
export type Phone = z.infer<typeof phoneSchema>;
export type Url = z.infer<typeof urlSchema>;

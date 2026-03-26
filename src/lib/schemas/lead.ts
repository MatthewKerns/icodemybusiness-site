import { z } from "zod";
import { emailSchema } from "./common";

/**
 * Lead input schema for capturing email leads with attribution.
 * Matches the structure of the Convex leads table input requirements.
 *
 * Required fields:
 * - email: Validated email address (uses emailSchema from common.ts)
 *
 * Optional fields:
 * - name: User's name if provided
 * - source: Attribution source (e.g., "newsletter", "free-tools")
 * - variant: A/B test variant identifier
 * - sessionId: Analytics session identifier
 * - clerkUserId: Clerk user ID if authenticated
 */
export const leadInputSchema = z.object({
  email: emailSchema,
  name: z
    .string({
      invalid_type_error: "Name must be a string",
    })
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name is too long (maximum 100 characters)")
    .optional(),
  source: z
    .string({
      invalid_type_error: "Source must be a string",
    })
    .trim()
    .max(100, "Source is too long (maximum 100 characters)")
    .optional(),
  variant: z
    .string({
      invalid_type_error: "Variant must be a string",
    })
    .trim()
    .max(50, "Variant is too long (maximum 50 characters)")
    .optional(),
  sessionId: z
    .string({
      invalid_type_error: "Session ID must be a string",
    })
    .trim()
    .optional(),
  clerkUserId: z
    .string({
      invalid_type_error: "Clerk user ID must be a string",
    })
    .trim()
    .optional(),
});

/**
 * Full lead schema including system-generated fields.
 * Represents a complete lead record as stored in the Convex database.
 */
export const leadSchema = leadInputSchema.extend({
  score: z
    .number({
      required_error: "Score is required",
      invalid_type_error: "Score must be a number",
    })
    .int("Score must be an integer")
    .min(0, "Score cannot be negative"),
  createdAt: z
    .number({
      required_error: "Created timestamp is required",
      invalid_type_error: "Created timestamp must be a number",
    })
    .positive("Created timestamp must be positive"),
});

/**
 * Type exports for use in components and functions.
 */
export type LeadInput = z.infer<typeof leadInputSchema>;
export type Lead = z.infer<typeof leadSchema>;

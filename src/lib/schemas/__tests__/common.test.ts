import { describe, it, expect } from "vitest";
import {
  emailSchema,
  phoneSchema,
  phoneSchemaOptional,
  urlSchema,
  urlSchemaOptional,
} from "../common";

describe("emailSchema", () => {
  it("validates correct email addresses", () => {
    expect(emailSchema.parse("user@example.com")).toBe("user@example.com");
    expect(emailSchema.parse("test.user@example.co.uk")).toBe(
      "test.user@example.co.uk"
    );
    expect(emailSchema.parse("user+tag@example.com")).toBe(
      "user+tag@example.com"
    );
  });

  it("converts email to lowercase and trims", () => {
    expect(emailSchema.parse("USER@EXAMPLE.COM")).toBe("user@example.com");
    expect(emailSchema.parse("Test.User@Example.Com")).toBe(
      "test.user@example.com"
    );
  });

  it("rejects empty string", () => {
    expect(() => emailSchema.parse("")).toThrow("Email is required");
  });

  it("rejects invalid email formats", () => {
    expect(() => emailSchema.parse("invalid")).toThrow(
      "Please enter a valid email address"
    );
    expect(() => emailSchema.parse("invalid@")).toThrow(
      "Please enter a valid email address"
    );
    expect(() => emailSchema.parse("@example.com")).toThrow(
      "Please enter a valid email address"
    );
    expect(() => emailSchema.parse("user@")).toThrow(
      "Please enter a valid email address"
    );
  });

  it("rejects email addresses that are too long", () => {
    const longEmail = "a".repeat(250) + "@example.com";
    expect(() => emailSchema.parse(longEmail)).toThrow(
      "Email address is too long (maximum 254 characters)"
    );
  });

  it("rejects non-string values", () => {
    expect(() => emailSchema.parse(null)).toThrow();
    expect(() => emailSchema.parse(undefined)).toThrow();
    expect(() => emailSchema.parse(123)).toThrow();
  });
});

describe("phoneSchema", () => {
  it("validates correct E.164 phone numbers", () => {
    expect(phoneSchema.parse("+14155552671")).toBe("+14155552671");
    expect(phoneSchema.parse("+442071838750")).toBe("+442071838750");
    expect(phoneSchema.parse("+61234567890")).toBe("+61234567890");
    expect(phoneSchema.parse("+12345678901234")).toBe("+12345678901234"); // 14 digits max
  });

  it("rejects empty string", () => {
    expect(() => phoneSchema.parse("")).toThrow("Phone number is required");
  });

  it("rejects phone numbers without + prefix", () => {
    expect(() => phoneSchema.parse("14155552671")).toThrow(
      "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
    );
  });

  it("rejects phone numbers with invalid country code starting with 0", () => {
    expect(() => phoneSchema.parse("+04155552671")).toThrow(
      "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
    );
  });

  it("rejects phone numbers that are too long", () => {
    // E.164 allows max 15 digits total (including country code)
    // Regex is /^\+[1-9]\d{1,14}$/ which allows 2-15 digits after the +
    expect(() => phoneSchema.parse("+1234567890123456")).toThrow(
      "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
    );
  });

  it("rejects phone numbers with letters or special characters", () => {
    expect(() => phoneSchema.parse("+1415555CALL")).toThrow(
      "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
    );
    expect(() => phoneSchema.parse("+1-415-555-2671")).toThrow(
      "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
    );
    expect(() => phoneSchema.parse("+1 415 555 2671")).toThrow(
      "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
    );
  });

  it("rejects non-string values", () => {
    expect(() => phoneSchema.parse(null)).toThrow();
    expect(() => phoneSchema.parse(undefined)).toThrow();
    expect(() => phoneSchema.parse(123)).toThrow();
  });
});

describe("phoneSchemaOptional", () => {
  it("validates correct E.164 phone numbers", () => {
    expect(phoneSchemaOptional.parse("+14155552671")).toBe("+14155552671");
    expect(phoneSchemaOptional.parse("+442071838750")).toBe("+442071838750");
  });

  it("allows empty string", () => {
    expect(phoneSchemaOptional.parse("")).toBe("");
  });

  it("allows undefined", () => {
    expect(phoneSchemaOptional.parse(undefined)).toBeUndefined();
  });

  it("rejects invalid phone numbers", () => {
    expect(() => phoneSchemaOptional.parse("14155552671")).toThrow(
      "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
    );
    expect(() => phoneSchemaOptional.parse("+1-415-555-2671")).toThrow(
      "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
    );
  });
});

describe("urlSchema", () => {
  it("validates correct URLs with protocol", () => {
    expect(urlSchema.parse("https://example.com")).toBe(
      "https://example.com"
    );
    expect(urlSchema.parse("http://example.com")).toBe("http://example.com");
    expect(urlSchema.parse("https://www.example.com/path")).toBe(
      "https://www.example.com/path"
    );
    expect(urlSchema.parse("https://example.com/path?query=value")).toBe(
      "https://example.com/path?query=value"
    );
  });


  it("rejects empty string", () => {
    expect(() => urlSchema.parse("")).toThrow("URL is required");
  });

  it("rejects URLs without protocol", () => {
    expect(() => urlSchema.parse("example.com")).toThrow(
      "Please enter a valid URL (e.g., https://example.com)"
    );
    expect(() => urlSchema.parse("www.example.com")).toThrow(
      "Please enter a valid URL (e.g., https://example.com)"
    );
  });

  it("rejects invalid URLs", () => {
    expect(() => urlSchema.parse("not a url")).toThrow(
      "Please enter a valid URL (e.g., https://example.com)"
    );
    expect(() => urlSchema.parse("https://")).toThrow(
      "Please enter a valid URL (e.g., https://example.com)"
    );
  });

  it("rejects non-string values", () => {
    expect(() => urlSchema.parse(null)).toThrow();
    expect(() => urlSchema.parse(undefined)).toThrow();
    expect(() => urlSchema.parse(123)).toThrow();
  });
});

describe("urlSchemaOptional", () => {
  it("validates correct URLs with protocol", () => {
    expect(urlSchemaOptional.parse("https://example.com")).toBe(
      "https://example.com"
    );
    expect(urlSchemaOptional.parse("http://example.com")).toBe(
      "http://example.com"
    );
  });

  it("allows empty string", () => {
    expect(urlSchemaOptional.parse("")).toBe("");
  });

  it("allows undefined", () => {
    expect(urlSchemaOptional.parse(undefined)).toBeUndefined();
  });

  it("rejects invalid URLs", () => {
    expect(() => urlSchemaOptional.parse("example.com")).toThrow(
      "Please enter a valid URL (e.g., https://example.com)"
    );
    expect(() => urlSchemaOptional.parse("not a url")).toThrow(
      "Please enter a valid URL (e.g., https://example.com)"
    );
  });
});

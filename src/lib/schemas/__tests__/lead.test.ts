import { describe, it, expect } from "vitest";
import { leadInputSchema, leadSchema } from "../lead";

describe("leadInputSchema", () => {
  describe("email field", () => {
    it("validates correct email addresses", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
      });
      expect(result.email).toBe("user@example.com");
    });

    it("converts email to lowercase", () => {
      const result = leadInputSchema.parse({
        email: "USER@EXAMPLE.COM",
      });
      expect(result.email).toBe("user@example.com");
    });

    it("rejects invalid email", () => {
      expect(() =>
        leadInputSchema.parse({
          email: "invalid",
        })
      ).toThrow("Please enter a valid email address");
    });

    it("rejects missing email", () => {
      expect(() => leadInputSchema.parse({})).toThrow();
    });
  });

  describe("name field (optional)", () => {
    it("accepts valid name", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
        name: "John Doe",
      });
      expect(result.name).toBe("John Doe");
    });

    it("trims name", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
        name: "  John Doe  ",
      });
      expect(result.name).toBe("John Doe");
    });

    it("allows name to be omitted", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
      });
      expect(result.name).toBeUndefined();
    });

    it("rejects empty name after trimming", () => {
      expect(() =>
        leadInputSchema.parse({
          email: "user@example.com",
          name: "   ",
        })
      ).toThrow("Name cannot be empty");
    });

    it("rejects name that is too long", () => {
      const longName = "a".repeat(101);
      expect(() =>
        leadInputSchema.parse({
          email: "user@example.com",
          name: longName,
        })
      ).toThrow("Name is too long (maximum 100 characters)");
    });

    it("rejects non-string name", () => {
      expect(() =>
        leadInputSchema.parse({
          email: "user@example.com",
          name: 123,
        })
      ).toThrow("Name must be a string");
    });
  });

  describe("source field (optional)", () => {
    it("accepts valid source", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
        source: "newsletter",
      });
      expect(result.source).toBe("newsletter");
    });

    it("trims source", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
        source: "  free-tools  ",
      });
      expect(result.source).toBe("free-tools");
    });

    it("allows source to be omitted", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
      });
      expect(result.source).toBeUndefined();
    });

    it("rejects source that is too long", () => {
      const longSource = "a".repeat(101);
      expect(() =>
        leadInputSchema.parse({
          email: "user@example.com",
          source: longSource,
        })
      ).toThrow("Source is too long (maximum 100 characters)");
    });

    it("rejects non-string source", () => {
      expect(() =>
        leadInputSchema.parse({
          email: "user@example.com",
          source: 123,
        })
      ).toThrow("Source must be a string");
    });
  });

  describe("variant field (optional)", () => {
    it("accepts valid variant", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
        variant: "control",
      });
      expect(result.variant).toBe("control");
    });

    it("trims variant", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
        variant: "  test-a  ",
      });
      expect(result.variant).toBe("test-a");
    });

    it("allows variant to be omitted", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
      });
      expect(result.variant).toBeUndefined();
    });

    it("rejects variant that is too long", () => {
      const longVariant = "a".repeat(51);
      expect(() =>
        leadInputSchema.parse({
          email: "user@example.com",
          variant: longVariant,
        })
      ).toThrow("Variant is too long (maximum 50 characters)");
    });

    it("rejects non-string variant", () => {
      expect(() =>
        leadInputSchema.parse({
          email: "user@example.com",
          variant: 123,
        })
      ).toThrow("Variant must be a string");
    });
  });

  describe("sessionId field (optional)", () => {
    it("accepts valid sessionId", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
        sessionId: "abc123",
      });
      expect(result.sessionId).toBe("abc123");
    });

    it("trims sessionId", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
        sessionId: "  abc123  ",
      });
      expect(result.sessionId).toBe("abc123");
    });

    it("allows sessionId to be omitted", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
      });
      expect(result.sessionId).toBeUndefined();
    });

    it("rejects non-string sessionId", () => {
      expect(() =>
        leadInputSchema.parse({
          email: "user@example.com",
          sessionId: 123,
        })
      ).toThrow("Session ID must be a string");
    });
  });

  describe("clerkUserId field (optional)", () => {
    it("accepts valid clerkUserId", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
        clerkUserId: "user_abc123",
      });
      expect(result.clerkUserId).toBe("user_abc123");
    });

    it("trims clerkUserId", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
        clerkUserId: "  user_abc123  ",
      });
      expect(result.clerkUserId).toBe("user_abc123");
    });

    it("allows clerkUserId to be omitted", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
      });
      expect(result.clerkUserId).toBeUndefined();
    });

    it("rejects non-string clerkUserId", () => {
      expect(() =>
        leadInputSchema.parse({
          email: "user@example.com",
          clerkUserId: 123,
        })
      ).toThrow("Clerk user ID must be a string");
    });
  });

  describe("complete lead input", () => {
    it("validates lead with all fields", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
        name: "John Doe",
        source: "newsletter",
        variant: "control",
        sessionId: "abc123",
        clerkUserId: "user_abc123",
      });

      expect(result).toEqual({
        email: "user@example.com",
        name: "John Doe",
        source: "newsletter",
        variant: "control",
        sessionId: "abc123",
        clerkUserId: "user_abc123",
      });
    });

    it("validates lead with only required fields", () => {
      const result = leadInputSchema.parse({
        email: "user@example.com",
      });

      expect(result).toEqual({
        email: "user@example.com",
      });
    });
  });
});

describe("leadSchema", () => {
  describe("extends leadInputSchema", () => {
    it("includes all leadInputSchema fields", () => {
      const result = leadSchema.parse({
        email: "user@example.com",
        name: "John Doe",
        source: "newsletter",
        variant: "control",
        sessionId: "abc123",
        clerkUserId: "user_abc123",
        score: 100,
        createdAt: 1234567890,
      });

      expect(result.email).toBe("user@example.com");
      expect(result.name).toBe("John Doe");
      expect(result.source).toBe("newsletter");
      expect(result.variant).toBe("control");
      expect(result.sessionId).toBe("abc123");
      expect(result.clerkUserId).toBe("user_abc123");
    });
  });

  describe("score field", () => {
    it("accepts valid score", () => {
      const result = leadSchema.parse({
        email: "user@example.com",
        score: 100,
        createdAt: 1234567890,
      });
      expect(result.score).toBe(100);
    });

    it("accepts zero score", () => {
      const result = leadSchema.parse({
        email: "user@example.com",
        score: 0,
        createdAt: 1234567890,
      });
      expect(result.score).toBe(0);
    });

    it("rejects negative score", () => {
      expect(() =>
        leadSchema.parse({
          email: "user@example.com",
          score: -1,
          createdAt: 1234567890,
        })
      ).toThrow("Score cannot be negative");
    });

    it("rejects non-integer score", () => {
      expect(() =>
        leadSchema.parse({
          email: "user@example.com",
          score: 100.5,
          createdAt: 1234567890,
        })
      ).toThrow("Score must be an integer");
    });

    it("rejects missing score", () => {
      expect(() =>
        leadSchema.parse({
          email: "user@example.com",
          createdAt: 1234567890,
        })
      ).toThrow("Score is required");
    });

    it("rejects non-number score", () => {
      expect(() =>
        leadSchema.parse({
          email: "user@example.com",
          score: "100",
          createdAt: 1234567890,
        })
      ).toThrow("Score must be a number");
    });
  });

  describe("createdAt field", () => {
    it("accepts valid timestamp", () => {
      const result = leadSchema.parse({
        email: "user@example.com",
        score: 100,
        createdAt: 1234567890,
      });
      expect(result.createdAt).toBe(1234567890);
    });

    it("rejects zero timestamp", () => {
      expect(() =>
        leadSchema.parse({
          email: "user@example.com",
          score: 100,
          createdAt: 0,
        })
      ).toThrow("Created timestamp must be positive");
    });

    it("rejects negative timestamp", () => {
      expect(() =>
        leadSchema.parse({
          email: "user@example.com",
          score: 100,
          createdAt: -1234567890,
        })
      ).toThrow("Created timestamp must be positive");
    });

    it("rejects missing timestamp", () => {
      expect(() =>
        leadSchema.parse({
          email: "user@example.com",
          score: 100,
        })
      ).toThrow("Created timestamp is required");
    });

    it("rejects non-number timestamp", () => {
      expect(() =>
        leadSchema.parse({
          email: "user@example.com",
          score: 100,
          createdAt: "1234567890",
        })
      ).toThrow("Created timestamp must be a number");
    });
  });

  describe("complete lead record", () => {
    it("validates complete lead with all fields", () => {
      const result = leadSchema.parse({
        email: "user@example.com",
        name: "John Doe",
        source: "newsletter",
        variant: "control",
        sessionId: "abc123",
        clerkUserId: "user_abc123",
        score: 100,
        createdAt: 1234567890,
      });

      expect(result).toEqual({
        email: "user@example.com",
        name: "John Doe",
        source: "newsletter",
        variant: "control",
        sessionId: "abc123",
        clerkUserId: "user_abc123",
        score: 100,
        createdAt: 1234567890,
      });
    });

    it("validates complete lead with only required fields", () => {
      const result = leadSchema.parse({
        email: "user@example.com",
        score: 100,
        createdAt: 1234567890,
      });

      expect(result).toEqual({
        email: "user@example.com",
        score: 100,
        createdAt: 1234567890,
      });
    });
  });
});

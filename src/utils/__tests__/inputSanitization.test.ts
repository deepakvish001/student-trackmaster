import { describe, it, expect } from "vitest";
import { sanitizeTextInput, sanitizeEmail, sanitizePhoneNumber, validateUUID } from "../inputSanitization";

describe("sanitizeTextInput", () => {
  it("strips script tags and their content", () => {
    expect(sanitizeTextInput("<script>alert(1)</script>Hello")).toBe("Hello");
  });

  it("strips other HTML tags but keeps their text content", () => {
    expect(sanitizeTextInput("<b>bold</b> text")).toBe("bold text");
  });

  it("strips javascript: and vbscript: protocols", () => {
    expect(sanitizeTextInput("javascript:alert(1)")).toBe("alert(1)");
    expect(sanitizeTextInput("vbscript:msgbox(1)")).toBe("msgbox(1)");
  });

  it("strips inline event handler attributes", () => {
    expect(sanitizeTextInput("onclick=alert(1)")).toBe("alert(1)");
  });

  it("trims whitespace", () => {
    expect(sanitizeTextInput("  spaced  ")).toBe("spaced");
  });

  it("returns an empty string for non-string input", () => {
    expect(sanitizeTextInput(null as unknown as string)).toBe("");
    expect(sanitizeTextInput(undefined as unknown as string)).toBe("");
  });

  it("truncates to 1000 characters", () => {
    const long = "a".repeat(1500);
    expect(sanitizeTextInput(long).length).toBe(1000);
  });
});

describe("sanitizeEmail", () => {
  it("lowercases and trims a valid email", () => {
    expect(sanitizeEmail("  Test@Example.com  ")).toBe("test@example.com");
  });

  it("rejects an email with consecutive dots", () => {
    expect(sanitizeEmail("bad..email@example.com")).toBe("");
  });

  it("rejects an email starting or ending with a dot", () => {
    expect(sanitizeEmail(".bad@example.com")).toBe("");
    expect(sanitizeEmail("bad@example.com.")).toBe("");
  });

  it("rejects a string with no @ sign", () => {
    expect(sanitizeEmail("not-an-email")).toBe("");
  });

  it("returns an empty string for non-string input", () => {
    expect(sanitizeEmail(null as unknown as string)).toBe("");
  });
});

describe("sanitizePhoneNumber", () => {
  it("keeps digits, spaces, +, -, and parentheses", () => {
    expect(sanitizePhoneNumber("+91 (987) 654-3210")).toBe("+91 (987) 654-3210");
  });

  it("strips other characters", () => {
    expect(sanitizePhoneNumber("abc123!!!")).toBe("123");
  });

  it("rejects a number containing five or more consecutive zeros", () => {
    expect(sanitizePhoneNumber("9800000123")).toBe("");
  });

  it("rejects a number longer than 20 characters after stripping", () => {
    expect(sanitizePhoneNumber("1".repeat(25))).toBe("");
  });

  it("returns an empty string for non-string input", () => {
    expect(sanitizePhoneNumber(null as unknown as string)).toBe("");
  });
});

describe("validateUUID", () => {
  it("accepts a valid v4 UUID", () => {
    expect(validateUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(validateUUID("not-a-uuid")).toBe(false);
  });

  it("rejects an empty or non-string value", () => {
    expect(validateUUID("")).toBe(false);
    expect(validateUUID(null as unknown as string)).toBe(false);
  });
});

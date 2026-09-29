import { describe, expect, it } from "vitest";

import {
  computeStrength,
  minStrengthMet,
} from "@/shared/utils/passwordStrength";

describe("computeStrength", () => {
  it("returns 'weak' for passwords shorter than the minimum length", () => {
    expect(computeStrength("Ab1!")).toBe("weak");
  });

  it("returns 'weak' for passwords meeting the length bar but only one character class", () => {
    expect(computeStrength("alllowercase")).toBe("weak");
  });

  it("returns 'fair' for passwords meeting the length bar with two character classes", () => {
    expect(computeStrength("lowerUPPER")).toBe("fair");
  });

  it("returns 'strong' for passwords meeting the strong length bar with three+ character classes", () => {
    expect(computeStrength("LowerUpper123!")).toBe("strong");
  });

  it("returns 'fair' (not 'strong') when length is strong but class diversity is insufficient", () => {
    expect(computeStrength("alllowercaseonly")).toBe("weak");
    expect(computeStrength("lowerUPPERlong")).toBe("fair");
  });
});

describe("minStrengthMet", () => {
  it("returns false for weak passwords", () => {
    expect(minStrengthMet("short")).toBe(false);
  });

  it("returns true for fair passwords", () => {
    expect(minStrengthMet("lowerUPPER")).toBe(true);
  });

  it("returns true for strong passwords", () => {
    expect(minStrengthMet("LowerUpper123!")).toBe(true);
  });
});

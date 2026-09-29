import { describe, expect, it } from "vitest";

import {
  getSecurityQuestionLabel,
  SECURITY_QUESTIONS,
} from "@/shared/data/securityQuestions";

describe("getSecurityQuestionLabel", () => {
  it("returns the label for a known question code", () => {
    expect(getSecurityQuestionLabel("FIRST_PET")).toBe(
      "What was the name of your first pet?",
    );
  });

  it("returns undefined for an unknown question code", () => {
    expect(getSecurityQuestionLabel("NOT_A_REAL_CODE")).toBeUndefined();
  });

  it("resolves every curated question code back to its own label", () => {
    for (const question of SECURITY_QUESTIONS) {
      expect(getSecurityQuestionLabel(question.code)).toBe(question.label);
    }
  });
});

/**
 * Curated, predefined security-question reference data (mirrors
 * `backend/src/data/security_questions.py`). Only `code` is ever sent to the server
 * (`security_question_code`); `label` is for display only.
 */

export interface SecurityQuestionOption {
  code: string;
  label: string;
}

export const SECURITY_QUESTIONS: SecurityQuestionOption[] = [
  { code: "FIRST_PET", label: "What was the name of your first pet?" },
  { code: "BIRTH_CITY", label: "In what city were you born?" },
  { code: "MOTHER_MAIDEN_NAME", label: "What is your mother's maiden name?" },
  { code: "FIRST_SCHOOL", label: "What was the name of your first school?" },
  { code: "FAVORITE_TEACHER", label: "Who was your favorite teacher?" },
];

export function getSecurityQuestionLabel(code: string): string | undefined {
  return SECURITY_QUESTIONS.find((q) => q.code === code)?.label;
}

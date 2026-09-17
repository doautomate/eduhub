/**
 * Password strength heuristic mirroring `backend/src/util/password_strength.py`
 * (research.md §3): a length + character-class-diversity heuristic bucketed into
 * Weak/Fair/Strong, so the client and server never disagree on the minimum
 * acceptable ("Fair") bar.
 */

export type PasswordStrength = "weak" | "fair" | "strong";

const MIN_LENGTH = 8;
const STRONG_LENGTH = 12;

function characterClassCount(password: string): number {
  let classes = 0;
  if (/[a-z]/.test(password)) classes += 1;
  if (/[A-Z]/.test(password)) classes += 1;
  if (/[0-9]/.test(password)) classes += 1;
  if (/[^a-zA-Z0-9]/.test(password)) classes += 1;
  return classes;
}

export function computeStrength(password: string): PasswordStrength {
  if (password.length < MIN_LENGTH) {
    return "weak";
  }

  const classes = characterClassCount(password);
  if (password.length >= STRONG_LENGTH && classes >= 3) {
    return "strong";
  }
  if (classes >= 2) {
    return "fair";
  }
  return "weak";
}

export function minStrengthMet(password: string): boolean {
  return computeStrength(password) !== "weak";
}

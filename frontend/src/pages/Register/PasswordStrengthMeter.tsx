import { cn } from "@/shared/utils/cn";
import { computeStrength } from "../../shared/utils/passwordStrength";

const LABELS: Record<string, string> = {
  weak: "Weak",
  fair: "Fair",
  strong: "Strong",
};

const SEGMENTS = ["weak", "fair", "strong"] as const;

interface PasswordStrengthMeterProps {
  password: string;
}

/**
 * Client-side password-strength indicator (US3, research.md §3; restyled with
 * token-driven, distinct-per-level colors under US2). Announces changes via an
 * ARIA live region so screen-reader users are notified as strength changes,
 * without requiring focus to move.
 */
export function PasswordStrengthMeter(props: PasswordStrengthMeterProps) {
  const strength = computeStrength(props.password);
  const label = LABELS[strength];
  const activeSegments = strength === "weak" ? 1 : strength === "fair" ? 2 : 3;
  const activeColor =
    strength === "weak"
      ? "bg-destructive"
      : strength === "fair"
        ? "bg-warning"
        : "bg-success";
  const textColor =
    strength === "weak"
      ? "text-destructive"
      : strength === "fair"
        ? "text-warning"
        : "text-success";

  return (
    <div data-testid="password-strength-meter" className="space-y-2">
      <div
        data-testid="password-strength-bar"
        data-strength={strength}
        className={`password-strength-bar password-strength-bar--${strength} flex gap-2`}
      >
        {SEGMENTS.map((segment, index) => (
          <span
            key={segment}
            aria-hidden="true"
            className={cn(
              "h-2 flex-1 rounded-full bg-muted transition-colors duration-200",
              index < activeSegments && activeColor,
            )}
          />
        ))}
      </div>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        Password strength: <span className={cn("font-medium", textColor)}>{label}</span>
      </p>
    </div>
  );
}

export default PasswordStrengthMeter;

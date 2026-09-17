import { ChevronDownIcon } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import { BOARD_OPTIONS, STANDARD_OPTIONS, type Board, type Standard } from "../../types/user";

export interface AcademicProfileFieldsProps {
  idPrefix: string;
  board: Board | "";
  boardOther: string;
  standard: Standard | "";
  onBoardChange: (board: Board | "") => void;
  onBoardOtherChange: (value: string) => void;
  onStandardChange: (standard: Standard | "") => void;
}

/**
 * Shared Board/Standard dropdown + conditional "Other" free-text input, used by
 * both `ProfileSetup` (US1) and `Profile`'s Edit mode (US3) so the two flows
 * never drift from each other (research.md/plan.md decision, T027).
 */
export function AcademicProfileFields({
  idPrefix,
  board,
  boardOther,
  standard,
  onBoardChange,
  onBoardOtherChange,
  onStandardChange,
}: AcademicProfileFieldsProps) {
  const selectClassName =
    "h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-board`}>Board</Label>
        <div className="relative">
          <select
            id={`${idPrefix}-board`}
            name="board"
            value={board}
            onChange={(e) => onBoardChange(e.target.value as Board)}
            className={selectClassName}
          >
            <option value="">Select a Board</option>
            {BOARD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      {board === "OTHER" && (
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${idPrefix}-board-other`}>Please specify your Board</Label>
          <Input
            id={`${idPrefix}-board-other`}
            name="boardOther"
            type="text"
            value={boardOther}
            onChange={(e) => onBoardOtherChange(e.target.value)}
            className="h-10"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-standard`}>Standard</Label>
        <div className="relative">
          <select
            id={`${idPrefix}-standard`}
            name="standard"
            value={standard}
            onChange={(e) => onStandardChange(e.target.value as Standard)}
            className={selectClassName}
          >
            <option value="">Select a Standard</option>
            {STANDARD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export default AcademicProfileFields;

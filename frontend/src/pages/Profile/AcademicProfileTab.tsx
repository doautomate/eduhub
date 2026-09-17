import { useState, type FormEvent } from "react";
import { CircleAlertIcon, GraduationCapIcon } from "lucide-react";

import { AcademicProfileFields } from "../../shared/components/AcademicProfileFields/AcademicProfileFields";
import { Alert, AlertDescription, AlertTitle } from "../../shared/components/ui/alert";
import { Button } from "../../shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { userService } from "../../shared/services/userService";
import { ApiError } from "../../shared/types/auth";
import { BOARD_OPTIONS, type Board, type Standard, type UserProfile } from "../../shared/types/user";

export interface AcademicProfileTabProps {
  accessToken: string;
  profile: UserProfile;
  onSaved: (updated: UserProfile) => void;
}

function boardLabel(currentProfile: UserProfile) {
  if (!currentProfile.board) {
    return "Not set";
  }
  if (currentProfile.board === "OTHER") {
    return currentProfile.board_other ?? "Not set";
  }
  return BOARD_OPTIONS.find((option) => option.value === currentProfile.board)?.label ?? "Not set";
}

/**
 * Academic Profile tab (013-profile-popover-management, US2): relocates the existing
 * board/standard editing UI (previously inline in Profile.tsx) into its own
 * independently-saveable tab (FR-021 audit trail applies server-side; no notification
 * email is sent for this section per FR-022).
 */
export function AcademicProfileTab({ accessToken, profile, onSaved }: AcademicProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [board, setBoard] = useState<Board | "">(profile.board ?? "");
  const [boardOther, setBoardOther] = useState(profile.board_other ?? "");
  const [standard, setStandard] = useState<Standard | "">(profile.standard ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function startEditing() {
    setBoard(profile.board ?? "");
    setBoardOther(profile.board_other ?? "");
    setStandard(profile.standard ?? "");
    setError(null);
    setSuccess(false);
    setIsEditing(true);
  }

  function cancelEditing() {
    // US3: an abandoned edit must never alter the previously saved values.
    setIsEditing(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!board || !standard) {
      setError("Board and Standard are both required.");
      return;
    }
    if (board === "OTHER" && !boardOther.trim()) {
      setError("Please tell us the name of your Board.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await userService.updateAcademicProfile(accessToken, {
        board,
        standard,
        boardOther: board === "OTHER" ? boardOther.trim() : null,
      });
      onSaved(updated);
      setSuccess(true);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to update your academic profile. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="bg-muted/20 py-0 shadow-none ring-border/60">
      <CardHeader className="gap-3 border-b border-border/70 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCapIcon className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle>Academic Profile</CardTitle>
            <CardDescription>
              Keep your Board and Standard aligned with your current studies.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <section aria-label="Academic Profile">
          {isEditing ? (
            <form onSubmit={handleSubmit} aria-label="Edit academic profile form" className="space-y-5">
              <AcademicProfileFields
                idPrefix="profile-academic"
                board={board}
                boardOther={boardOther}
                standard={standard}
                onBoardChange={setBoard}
                onBoardOtherChange={setBoardOther}
                onStandardChange={setStandard}
              />
              {error && (
                <Alert
                  variant="destructive"
                  className="state-message state-message--error border-destructive/30 bg-destructive/10 text-destructive"
                >
                  <CircleAlertIcon className="size-4" />
                  <AlertTitle>Unable to update academic profile</AlertTitle>
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}
              <div className="form-actions flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-w-[7.5rem]"
                  onClick={cancelEditing}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className={submitting ? "min-w-[7.5rem] is-loading" : "min-w-[7.5rem]"}
                >
                  {submitting ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                  <dt className="text-sm font-medium text-muted-foreground">Board</dt>
                  <dd className="mt-1 text-sm text-foreground">{boardLabel(profile)}</dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                  <dt className="text-sm font-medium text-muted-foreground">Standard</dt>
                  <dd className="mt-1 text-sm text-foreground">{profile.standard ?? "Not set"}</dd>
                </div>
              </dl>
              {success && (
                <div
                  role="status"
                  className="state-message state-message--success rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
                >
                  Your academic profile was updated successfully.
                </div>
              )}
              <div className="form-actions flex flex-row items-center justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="min-w-[7.5rem]"
                  onClick={startEditing}
                >
                  Edit
                </Button>
              </div>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

export default AcademicProfileTab;

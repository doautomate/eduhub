import { useState, type FormEvent } from "react";
import { CircleAlertIcon, GraduationCapIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../shared/hooks/useAuth";
import { userService } from "../shared/services/userService";
import { AcademicProfileFields } from "../shared/components/AcademicProfileFields/AcademicProfileFields";
import { Alert, AlertDescription, AlertTitle } from "../shared/components/ui/alert";
import { Button } from "../shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../shared/components/ui/card";
import type { Board, Standard } from "../shared/types/user";
import { ApiError } from "../shared/types/auth";

/**
 * First-login academic profile setup (US1) and later profile edit (US3) share
 * this same form/validation shape (research.md decision: one unified
 * PATCH endpoint + one shared component, per plan.md's project structure).
 */
export function ProfileSetup() {
  const { accessToken, profile } = useAuth();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | "">(profile?.board ?? "");
  const [boardOther, setBoardOther] = useState(profile?.board_other ?? "");
  const [standard, setStandard] = useState<Standard | "">(profile?.standard ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!board || !standard) {
      setError("Board and Standard are both required.");
      return;
    }
    if (board === "OTHER" && !boardOther.trim()) {
      setError("Please tell us the name of your Board.");
      return;
    }
    if (!accessToken) {
      return;
    }

    setSubmitting(true);
    try {
      await userService.updateAcademicProfile(accessToken, {
        board,
        standard,
        boardOther: board === "OTHER" ? boardOther.trim() : null,
      });
      navigate("/profile", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to save your academic profile. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen-shell mx-auto flex w-full justify-center p-4 md:p-8">
      <Card className="screen-card profile-card w-full max-w-3xl border-border/70 bg-card/95 shadow-sm backdrop-blur">
        <CardHeader className="gap-3 border-b border-border/70 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <GraduationCapIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl">
                <h1>Set Up Your Academic Profile</h1>
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6">
                Tell us your Board and Standard so we can tailor your experience. You can change
                these later from your profile.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} aria-label="Academic profile setup form" className="space-y-5">
            <AcademicProfileFields
              idPrefix="profile-setup"
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
                <AlertTitle>Unable to save profile</AlertTitle>
                <AlertDescription className="text-destructive">{error}</AlertDescription>
              </Alert>
            )}
            <div className="form-actions flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className={submitting ? "is-loading" : undefined}
              >
                {submitting ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProfileSetup;

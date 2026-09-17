import { useState, type FormEvent } from "react";
import { CircleAlertIcon, GraduationCapIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { AcademicProfileFields } from "../../shared/components/AcademicProfileFields/AcademicProfileFields";
import { Alert, AlertDescription, AlertTitle } from "../../shared/components/ui/alert";
import { Button } from "../../shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../shared/components/ui/card";
import { sessionQueryKey } from "../../shared/hooks/useSessionQuery";
import { userService } from "../../shared/services/userService";
import type { Board, Standard } from "../../shared/types/user";
import { ApiError } from "../../shared/types/auth";

export interface HomeProfileWidgetProps {
  accessToken: string;
}

/**
 * Inline profile-completion widget shown on Home while the user's academic
 * profile (Board/Standard) is incomplete (010-home-profile-widget, US1).
 *
 * Per the 2026-09-14 clarification, this embeds the same Board/Standard fields
 * used by `ProfileSetup` directly on Home - the user never navigates away to
 * complete their profile. On successful save, the PATCH response is written
 * straight into the shared session query cache (research.md decision) so
 * `Home` re-renders with profile-based content on its very next render, with
 * no reload and no flicker (FR-006/SC-004, 010-US2).
 */
export function HomeProfileWidget({ accessToken }: HomeProfileWidgetProps) {
  const queryClient = useQueryClient();
  const [board, setBoard] = useState<Board | "">("");
  const [boardOther, setBoardOther] = useState("");
  const [standard, setStandard] = useState<Standard | "">("");
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

    setSubmitting(true);
    try {
      const updatedProfile = await userService.updateAcademicProfile(accessToken, {
        board,
        standard,
        boardOther: board === "OTHER" ? boardOther.trim() : null,
      });
      // Write the fresh profile straight into the cache (synchronous, no
      // flicker) - see research.md. Deliberately not paired with an
      // immediate invalidateQueries()/refetch: that would race a network
      // round-trip against this synchronous write and risks momentarily
      // reverting to stale (incomplete) cached data before the refetch
      // resolves. Normal staleTime-based revalidation on next
      // navigation/focus is enough to reconcile with the server later.
      queryClient.setQueryData(sessionQueryKey(accessToken), updatedProfile);
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
    <Card className="screen-card home-profile-widget w-full max-w-3xl border-border/70 bg-card/95 shadow-sm backdrop-blur">
      <CardHeader className="gap-3 border-b border-border/70 pb-5">
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCapIcon className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">
              <h2>Complete your academic profile</h2>
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6">
              Tell us your Board and Standard so we can tailor your experience. You can change
              these later from your profile.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} aria-label="Academic profile completion widget" className="space-y-5">
          <AcademicProfileFields
            idPrefix="home-profile-widget"
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
  );
}

export default HomeProfileWidget;

import { useState, type FormEvent } from "react";
import { PhoneIcon, UserRoundIcon } from "lucide-react";

import { userService } from "../../shared/services/userService";
import { Alert, AlertDescription, AlertTitle } from "../../shared/components/ui/alert";
import { Button } from "../../shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { Input } from "../../shared/components/ui/input";
import { Label } from "../../shared/components/ui/label";
import { ApiError } from "../../shared/types/auth";
import type { UserProfile } from "../../shared/types/user";
import { CircleAlertIcon } from "lucide-react";

export interface PersonalDetailsTabProps {
  accessToken: string;
  profile: UserProfile;
  onSaved: (updated: UserProfile) => void;
}

/**
 * Personal Details tab (013-profile-popover-management, US2): full name/email are
 * read-only; only the mobile number is editable, saved independently via
 * `PATCH /users/me/personal-details` (FR-008/FR-009). Defaults to a read-only view
 * with an "Edit" action; clicking it reveals the editable form with Cancel/Save
 * changes actions, mirroring the Academic Profile and Address Details tabs.
 */
export function PersonalDetailsTab({ accessToken, profile, onSaved }: PersonalDetailsTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [mobileNumber, setMobileNumber] = useState(profile.mobile_number);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function startEditing() {
    setMobileNumber(profile.mobile_number);
    setError(null);
    setSuccess(false);
    setIsEditing(true);
  }

  function handleCancel() {
    // US3: an abandoned edit must never alter the previously saved value.
    setMobileNumber(profile.mobile_number);
    setError(null);
    setIsEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!mobileNumber.trim()) {
      setError("Mobile number is required.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await userService.updatePersonalDetails(accessToken, {
        mobileNumber: mobileNumber.trim(),
      });
      onSaved(updated);
      setSuccess(true);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to update your mobile number. Please try again.");
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
            <UserRoundIcon className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle>Personal details</CardTitle>
            <CardDescription>Your verified identity information.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <section aria-label="Personal Details">
          {isEditing ? (
            <form
              onSubmit={handleSubmit}
              aria-label="Edit personal details form"
              className="space-y-5"
            >
              <dl className="grid gap-4 sm:grid-cols-[minmax(0,11rem)_1fr]">
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                  <dd className="text-sm text-foreground">
                    {profile.first_name} {profile.last_name}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="break-all text-sm text-foreground">{profile.email}</dd>
                </div>
              </dl>
              <div className="space-y-2">
                <Label htmlFor="personal-details-mobile-number">
                  <PhoneIcon className="mr-1 inline size-4 align-text-bottom" />
                  Mobile Number
                </Label>
                <Input
                  id="personal-details-mobile-number"
                  name="mobileNumber"
                  type="tel"
                  value={mobileNumber}
                  className="h-10 bg-background"
                  onChange={(e) => setMobileNumber(e.target.value)}
                />
              </div>
              {error && (
                <Alert
                  variant="destructive"
                  className="state-message state-message--error border-destructive/30 bg-destructive/10 text-destructive"
                >
                  <CircleAlertIcon className="size-4" />
                  <AlertTitle>Unable to update mobile number</AlertTitle>
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}
              <div className="form-actions flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-w-[7.5rem]"
                  onClick={handleCancel}
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
              <dl className="grid gap-4 sm:grid-cols-[minmax(0,11rem)_1fr]">
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                  <dd className="text-sm text-foreground">
                    {profile.first_name} {profile.last_name}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="break-all text-sm text-foreground">{profile.email}</dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">
                    <PhoneIcon className="mr-1 inline size-4 align-text-bottom" />
                    Mobile Number
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">{profile.mobile_number}</dd>
                </div>
              </dl>
              {success && (
                <div
                  role="status"
                  className="state-message state-message--success rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
                >
                  Your mobile number was updated successfully.
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

export default PersonalDetailsTab;

import { useEffect, useState } from "react";
import { CircleAlertIcon, UserRoundIcon } from "lucide-react";

import { useAuth } from "../shared/hooks/useAuth";
import { userService } from "../shared/services/userService";
import { Alert, AlertDescription, AlertTitle } from "../shared/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../shared/components/ui/card";
import { EmptyState } from "../shared/components/ui/empty-state";
import { Skeleton } from "../shared/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shared/components/ui/tabs";
import type { UserProfile } from "../shared/types/user";
import { PersonalDetailsTab } from "./Profile/PersonalDetailsTab";
import { AcademicProfileTab } from "./Profile/AcademicProfileTab";
import { AddressDetailsTab } from "./Profile/AddressDetailsTab";

/**
 * Authenticated "My Profile" page (013-profile-popover-management, US2/US3): three
 * independently-saveable shadcn/ui Tabs - Personal Details (default-active), Academic
 * Profile, Address Details. Each tab keeps its own draft/save state (T042-T044); Radix
 * Tabs keeps all three mounted (`forceMount`) so switching tabs never discards an
 * in-progress, unsaved edit in another tab.
 */
export function Profile() {
  const { accessToken, isVerified } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal-details");

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    userService.getProfile(accessToken).then(
      (result) => {
        if (!active) {
          return;
        }
        setProfile(result);
        setLoading(false);
      },
      () => {
        if (active) {
          setError("Unable to load your profile. Please try again.");
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [accessToken]);

  if (loading) {
    return (
      <div className="screen-shell mx-auto flex w-full justify-center p-4 md:p-8">
        <Card className="screen-card profile-card w-full max-w-5xl border-border/70 bg-card/95 shadow-sm backdrop-blur">
          <CardHeader className="gap-3 border-b border-border/70 pb-5">
            <CardTitle className="text-2xl">
              <h1>My Profile</h1>
            </CardTitle>
            <CardDescription>Loading your profile...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-52 w-full rounded-xl" />
              </div>
              <Skeleton className="h-80 w-full rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile || !accessToken) {
    return (
      <div className="screen-shell mx-auto flex w-full justify-center p-4 md:p-8">
        <div className="w-full max-w-3xl space-y-4">
          {error && (
            <Alert
              variant="destructive"
              className="state-message state-message--error border-destructive/30 bg-destructive/10 text-destructive"
            >
              <CircleAlertIcon className="size-4" />
              <AlertTitle>Unable to load profile</AlertTitle>
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}
          <EmptyState
            icon={<UserRoundIcon className="size-5" />}
            title="Your profile is not available right now."
            description="Please try refreshing this page in a moment."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="screen-shell mx-auto flex w-full justify-center p-4 md:p-8">
      <Card className="screen-card profile-card w-full max-w-5xl border-border/70 bg-card/95 shadow-sm backdrop-blur">
        <CardHeader className="gap-3 border-b border-border/70 pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">
                <h1>My Profile</h1>
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6">
                Review your identity details, keep your academic preferences current, and manage
                the address we use for your account.
              </CardDescription>
            </div>
            <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Account settings
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {!isVerified && (
            <Alert
              data-testid="unverified-profile-notice"
              className="state-message state-message--warning border-warning/30 bg-warning/10 text-warning"
            >
              <CircleAlertIcon className="size-4" />
              <AlertTitle>Email verification pending</AlertTitle>
              <AlertDescription className="text-warning">
                Your email address is not yet verified. Some account recovery features are
                unavailable until you verify it.
              </AlertDescription>
            </Alert>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="personal-details">Personal Details</TabsTrigger>
              <TabsTrigger value="academic-profile">Academic Profile</TabsTrigger>
              <TabsTrigger value="address-details">Address Details</TabsTrigger>
            </TabsList>
            {/*
             * Each TabsContent stays mounted (forceMount, see tabs.tsx) so an
             * in-progress edit in one tab survives switching away and back
             * (US3/T042). The CSS `data-[state=inactive]:hidden` class alone
             * doesn't reliably remove inactive panels from the accessibility
             * tree in every test environment, so the native `hidden` attribute
             * is also applied explicitly here as the authoritative signal.
             */}
            <TabsContent value="personal-details" hidden={activeTab !== "personal-details"}>
              <PersonalDetailsTab
                accessToken={accessToken}
                profile={profile}
                onSaved={setProfile}
              />
            </TabsContent>
            <TabsContent value="academic-profile" hidden={activeTab !== "academic-profile"}>
              <AcademicProfileTab
                accessToken={accessToken}
                profile={profile}
                onSaved={setProfile}
              />
            </TabsContent>
            <TabsContent value="address-details" hidden={activeTab !== "address-details"}>
              <AddressDetailsTab
                accessToken={accessToken}
                profile={profile}
                onSaved={setProfile}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default Profile;

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/button";
import { ProfilePopover } from "./ProfilePopover";

/** First name's initial, plus last name's initial only when a last name exists. */
function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.trim().charAt(0) ?? "";
  const last = lastName?.trim().charAt(0) ?? "";
  return (first + last).toUpperCase();
}

/**
 * Top-right identity control (FR-006/FR-007): a "Log in" button for signed-out
 * visitors, or (once authenticated) a round avatar showing the user's name
 * initials. Clicking the avatar opens a shadcn/ui Popover (ProfilePopover)
 * with an identity snapshot plus "Manage Profile"/"Logout" actions
 * (013-profile-popover-management) - Logout is reachable only via the
 * popover, not a separate header button.
 */
export function HeaderIdentityControl() {
  const { isAuthenticated, profile, isVerified } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <Button
        type="button"
        onClick={() => navigate("/login")}
        className="bg-white font-semibold text-primary hover:bg-white/90"
      >
        Log in
      </Button>
    );
  }

  const initials = getInitials(profile?.first_name, profile?.last_name);

  return (
    <div className="flex items-center gap-2" data-testid="header-identity-control">
      <ProfilePopover initials={initials} />
      {!isVerified && (
        <span
          data-testid="unverified-badge"
          className="rounded-sm border border-[var(--warning)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--warning)]"
        >
          Unverified
        </span>
      )}
    </div>
  );
}

export default HeaderIdentityControl;

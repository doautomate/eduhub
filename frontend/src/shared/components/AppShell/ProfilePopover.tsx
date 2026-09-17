import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCapIcon, MailIcon, PhoneIcon, UserRoundIcon } from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { BOARD_OPTIONS } from "../../types/user";

export interface ProfilePopoverProps {
  /** Initials shown in the trigger avatar (already computed by the caller). */
  initials: string;
}

/** Resolves a Board enum value to its human-readable label, falling back to the raw
 * value (e.g. a free-text "Other" board is stored directly on the profile). */
function boardLabel(board: string | null, boardOther: string | null): string {
  if (!board) {
    return "Not set";
  }
  if (board === "OTHER") {
    return boardOther?.trim() || "Other";
  }
  return BOARD_OPTIONS.find((option) => option.value === board)?.label ?? board;
}

/**
 * Identity-snapshot popover (013-profile-popover-management, FR-001-FR-005): shown when
 * the header avatar is clicked. Presents full name, email, mobile number, class/standard,
 * and board, followed by "Manage Profile" (navigates to `/profile`) and "Logout", each
 * section separated by a visible `Separator`. Radix's Popover already closes on
 * outside-click and `Escape` without side effects (no navigation, no logout call).
 */
export function ProfilePopover({ initials }: ProfilePopoverProps) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate("/", { replace: true });
  }

  function handleManageProfile() {
    setOpen(false);
    navigate("/profile");
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="My profile"
          aria-haspopup="dialog"
          aria-expanded={open}
          data-testid="header-profile-avatar"
          className="rounded-full outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Avatar>
            <AvatarFallback>{initials || "?"}</AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent data-testid="profile-popover">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-medium">
            <UserRoundIcon className="size-4 shrink-0 text-muted-foreground" />
            <span data-testid="profile-popover-full-name">{fullName || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MailIcon className="size-4 shrink-0" />
            <span data-testid="profile-popover-email">{profile?.email ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <PhoneIcon className="size-4 shrink-0" />
            <span data-testid="profile-popover-mobile-number">
              {profile?.mobile_number ?? "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCapIcon className="size-4 shrink-0" />
            <span data-testid="profile-popover-standard-board">
              {profile?.standard ?? "Not set"} · {boardLabel(profile?.board ?? null, profile?.board_other ?? null)}
            </span>
          </div>
        </div>

        <Separator className="my-3" decorative={false} />

        <button
          type="button"
          onClick={handleManageProfile}
          data-testid="profile-popover-manage-profile"
          className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Manage Profile
        </button>

        <Separator className="my-2" decorative={false} />

        <button
          type="button"
          onClick={handleLogout}
          data-testid="profile-popover-logout"
          className="w-full rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Logout
        </button>
      </PopoverContent>
    </Popover>
  );
}

export default ProfilePopover;

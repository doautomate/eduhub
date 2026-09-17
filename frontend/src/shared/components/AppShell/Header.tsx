import { Link } from "react-router-dom";
import logo from "../../../assets/images/eduvid-logo.svg";
import { HeaderIdentityControl } from "./HeaderIdentityControl";
import { ThemeToggle } from "../../theme";

/**
 * Header nav links to the (currently placeholder) resource pages, matching
 * the marketing landing page's "power-up" cards.
 */
const HEADER_NAV_LINKS = [
  { to: "/notes", label: "Notes" },
  { to: "/mind-maps", label: "Mind Maps" },
  { to: "/sample-papers", label: "Sample Papers" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

/**
 * Top app bar: "EduVid" branding + logo on the left (FR-003), the theme toggle
 * (US4/FR-011), and the sign-in/profile identity control on the top-right
 * (FR-006/FR-007). The header now matches the body's background/foreground
 * exactly (`bg-background text-foreground`, same as `AppShell`'s wrapper) so
 * it blends with the page instead of keeping a separate brand color; only its
 * height (half the original) is still set from the `--header-height` token.
 */
export function Header() {
  return (
    <header
      className="flex items-center justify-between gap-4 border-b border-border/20 bg-background px-6 text-foreground"
      style={{
        height: "var(--header-height)",
        flexShrink: 0,
      }}
    >
      <Link to="/" className="flex items-center gap-2 no-underline" aria-label="EduVid home">
        <img src={logo} alt="" width={32} height={32} />
        <span className="text-xl font-bold">EduVid</span>
      </Link>
      <nav aria-label="Resources" className="hidden items-center gap-6 sm:flex">
        {HEADER_NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-sm font-medium no-underline hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <HeaderIdentityControl />
      </div>
    </header>
  );
}

export default Header;

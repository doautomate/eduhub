import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/hooks/useAuth";
import { HomeProfileWidget } from "./HomeProfileWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";

const POWER_UPS = [
  {
    icon: "📚",
    title: "Chapter Notes",
    description: "Concise, high-yield summaries built to cut reading time by half.",
    cta: "Read Notes →",
  },
  {
    icon: "🧠",
    title: "Visual Mind Maps",
    description: "Connect concepts and spot patterns at a single glance.",
    cta: "View Maps →",
  },
  {
    icon: "📝",
    title: "Sample Papers",
    description: "Board-aligned papers with step-by-step solved answer keys.",
    cta: "Download PDFs →",
  },
] as const;

const TOP_DOWNLOADS = [
  "Class 10 Science - CBSE Solved Question Paper 2026",
  "Class 12 Biology - Genetics Full Chapter Visual Mind Map",
  "Class 9 Mathematics - High-Yield Revision Formula Sheets",
] as const;

/**
 * Marketing landing content shown to signed-out visitors (FR-008/US3): a
 * hero, a "power-up" feature grid (Notes / Mind Maps / Sample Papers), and a
 * top-downloads highlight strip. Kept as a standalone component so the
 * signed-in branches of `Home` (profile widget / personalized greeting)
 * remain untouched.
 */
function LandingHome({
  isAuthenticated,
  firstName,
}: {
  isAuthenticated: boolean;
  firstName: string | undefined;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col items-start gap-6 py-6 md:py-10">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight text-foreground md:text-4xl">
          Master Your Exams with Crisp Visuals &amp; Smart Practice
        </h1>
        <p className="max-w-xl text-base text-muted-foreground md:text-lg">
          Your ultimate hub for high-quality chapter notes, interactive mind maps, and solved
          sample papers designed to accelerate revision.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" size="lg" onClick={() => navigate("/register")}>
            Get Free Access Now
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() =>
              document
                .getElementById("power-ups")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            Explore Resources ↓
          </Button>
        </div>
      </section>

      {isAuthenticated && <ProgressDashboard firstName={firstName} />}

      <section id="power-ups" className="flex flex-col gap-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          ⚡ Choose Your Power-Up
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {POWER_UPS.map((powerUp) => (
            <Card key={powerUp.title}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {powerUp.icon} {powerUp.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <CardDescription>{powerUp.description}</CardDescription>
                <Button type="button" variant="link" className="self-start px-0">
                  {powerUp.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-muted/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          🔥 Top Downloads This Week
        </h2>
        <ul className="flex flex-col gap-2">
          {TOP_DOWNLOADS.map((item) => (
            <li key={item} className="text-sm text-foreground">
              • {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const RESUME_ITEMS = [
  {
    type: "Notes",
    title: "Carbon & Its Compounds (Chemistry)",
    status: "65% remaining",
    cta: "Resume",
  },
  {
    type: "Mind Map",
    title: "Human Nervous System (Biology)",
    status: "Not started",
    cta: "Launch",
  },
] as const;

/**
 * Progress dashboard shown only to signed-in users, between the hero and the
 * "Choose Your Power-Up" section. Figures are placeholder data until real
 * progress-tracking is built; the layout/labels follow the requested
 * template exactly.
 */
function ProgressDashboard({ firstName }: { firstName: string | undefined }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-foreground">
        📊 My Progress Dashboard (Welcome Back{firstName ? `, ${firstName}` : ""}!)
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">📚 Syllabus Completed</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: "52%" }} />
            </div>
            <p className="text-sm text-muted-foreground">52% Done</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🧠 Mind Maps Mastered</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-2xl font-bold text-foreground">14 / 32</p>
            <p className="text-sm text-muted-foreground">+2 this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">📝 Latest Mock Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-2xl font-bold text-foreground">84%</p>
            <p className="text-sm text-muted-foreground">Class 10 Science</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          ⏱️ Resume Learning
        </h3>
        <ul className="flex flex-col gap-2">
          {RESUME_ITEMS.map((item) => (
            <li
              key={item.title}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-4 py-3"
            >
              <span className="text-sm text-foreground">
                → [{item.type}] {item.title} - {item.status}
              </span>
              <Button type="button" variant="outline" size="sm">
                {item.cta}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Universal landing page (FR-008): every visitor - signed in or not, and
 * first-time visitors alike - lands on the same marketing template
 * (`LandingHome`). Signed-in visitors additionally see a progress dashboard
 * between the hero and the "Choose Your Power-Up" section, and (if their
 * academic profile is incomplete) the profile-completion widget appended
 * below the marketing content so they can finish onboarding without
 * leaving the page.
 *
 * 010-home-profile-widget: profile/completeness now come from the shared
 * `useAuth`/TanStack Query session cache (not a separate fetch here), so this
 * page and `RequireAcademicProfile` can never disagree about completeness,
 * and a save made via `HomeProfileWidget` is reflected here on the very next
 * render without a reload (research.md decision).
 */
export function Home() {
  const { isAuthenticated, profile, academicProfileComplete, isProfileLoading, accessToken } =
    useAuth();

  const showWidget =
    isAuthenticated && !isProfileLoading && academicProfileComplete === false && accessToken;
  const showWidgetLoading = isAuthenticated && (isProfileLoading || academicProfileComplete === undefined);

  return (
    <div className="mx-auto flex max-w-5xl flex-col p-6 md:p-10">
      <LandingHome isAuthenticated={isAuthenticated} firstName={profile?.first_name} />

      {showWidgetLoading && (
        <div className="mt-10 flex max-w-2xl flex-col gap-4">
          <p className="text-sm text-muted-foreground">Loading your profile status…</p>
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {/* FR-001/US1: incomplete profile -> inline completion widget appended
          below the marketing content, without hiding it (checked only once
          loading has resolved, per FR-008). */}
      {showWidget && (
        <div className="mt-10 flex max-w-2xl flex-col gap-4">
          <HomeProfileWidget accessToken={accessToken} />
        </div>
      )}
    </div>
  );
}

export default Home;


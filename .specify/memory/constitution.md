<!--
Sync Impact Report
- Version change: 1.0.1 → 1.0.2
- Modified principles: none (no Core Principle content or numbering changed)
- Modified sections: "Project stracture" → "UI stracture" replaced. The previous UI stracture
  described a React Native/Expo mobile app (android/, ios/, metro.config.js, features/ vertical
  slices) which did not match the actual implementation: a Vite + React web SPA. Replaced with the
  real, implemented `frontend/src/` layout (5 top-level folders: app/, pages/, shared/, styles/,
  assets/, plus mirrored tests/unit/), taken as source of truth from the codebase after the
  012-frontend-structure-cleanup refactor. This is a factual correction (PATCH), not a principle
  redefinition or addition.
- Added sections: none
- Removed sections: none
- Templates requiring updates: none (project-structure section is descriptive guidance, not a
  numbered Core Principle referenced by templates)
- Follow-up TODOs:
  - TODO(PROJECT_NAME): No project name found in README.md, package.json, or pyproject.toml
    metadata beyond the backend package "fastapi-app". Confirm the umbrella project name.
  - TODO(RATIFICATION_DATE): Original adoption date unknown; set to date of first ratification
    when confirmed.
-->

# TODO(PROJECT_NAME) Constitution

## Core Principles
### I. Type Safety & Static Analysis (NON-NEGOTIABLE)

Backend: Python 3.12+, full type hints on every public function signature, mypy --strict run in CI with zero errors permitted. Pydantic v2 models are the single source of truth for every request/response shape — untyped dicts MUST NOT cross a service or API boundary.

Frontend: TypeScript in strict mode (strict: true, noImplicitAny, noUncheckedIndexedAccess). any is prohibited except in a reviewed, commented escape hatch that explains why. ESLint runs with type-aware rules (@typescript-eslint/recommended-requiring-type-checking).

Rationale: a type error caught by the compiler or linter is orders of magnitude cheaper than the same error caught by a student mid-lesson. A single Pydantic-model source of truth also prevents frontend/backend schema drift, which is the most common source of "works on my machine" bugs in a FastAPI + React split.

### II. Test-First, Coverage-Gated Delivery (NON-NEGOTIABLE)

Tests are written before or alongside implementation, not after. In Spec Kit's /speckit.tasks output, test tasks MUST be enumerated before the implementation tasks they validate.

  Backend: pytest with pytest-cov; ≥90% line coverage on new or changed code (via diff-cover), not a repo-wide ratchet that punishes legacy code. Contract tests are generated from the live OpenAPI schema for every endpoint. Repository/data-access code is tested against a real PostgreSQL instance via testcontainers, not mocks.
  
  Frontend: Vitest + React Testing Library for unit/component tests (≥80% on new code). Playwright covers critical user journeys (auth, question practice flow, leaderboard) against a staging build in CI. Snapshot tests MUST NOT be the primary assertion mechanism — they assert "it changed," not "it's correct."

Rationale: coverage gates on the diff, not the whole tree, catch regressions without creating a wall of legacy-code busywork. Testing against real Postgres catches the class of bugs (constraint violations, transaction isolation) that mocks hide.

### III. Secure by Default (NON-NEGOTIABLE)
OWASP ASVS Level 2 is the baseline for authentication, session management, and access control.
Secrets (DB credentials, JWT signing keys, LLM provider API keys) live in a secrets manager (Kubernetes Secrets backed by an external vault, e.g. AWS Secrets Manager / HashiCorp Vault) — never in .env files committed to source control, and never baked into a container image.
AuthN via OAuth2/OIDC or short-lived JWT access tokens with rotating refresh tokens; AuthZ is enforced with explicit RBAC checks at the API layer — a hidden frontend route is never treated as an access control.
Every input is validated at the boundary: Pydantic models on the backend, mirrored zod/yup schemas on the frontend for the same shapes.
Dependency scanning (pip-audit/Safety for Python, npm audit + Dependabot/Snyk for JS) blocks CI on High/Critical findings. SAST (Bandit for Python, an ESLint security plugin for JS) and container image scanning (Trivy or Grype) run on every PR and before every deploy.
CORS is explicitly allow-listed per environment; wildcard origins are forbidden in production. All public endpoints carry rate limits and request-size limits.

Rationale: security defects are cheapest to fix before merge. Treating this as MUST rather than SHOULD reflects that this is a platform for minors — the bar for "good enough" is higher than a typical B2B SaaS product.

### IV. API Contract Stability
The OpenAPI schema is generated from FastAPI's own Pydantic models — it is never hand-maintained separately from code. Endpoints are versioned under api/v{n}/ (OpenAPI/schema) before
frontend integration begins. Breaking changes to a published contract MUST bump the API major
version and MUST NOT silently change existing response shapes. Contract changes MUST include
updated consumer-facing documentation in the same pull request. Rationale: the frontend and
backend are developed and deployed independently (separate Docker images/compose files), so an
undocumented contract change can break the frontend without a corresponding code change there.

Rationale: this keeps the generated API docs and the frontend's typed client (e.g. orval or openapi-typescript) permanently in sync with what is actually deployed, eliminating an entire class of "the frontend team didn't know the field was renamed" incidents.

### X. Code Quality & Review Gate
All changes MUST pass automated linting and formatting checks (as configured via
`.pre-commit-config.yaml` and each service's linter) and MUST receive at least one human review
approval before merge. Generated or scaffolded code MUST be reviewed with the same rigor as
hand-written code. Rationale: consistent quality gates prevent scaffold-generated boilerplate from
silently diverging from project standards over time.

### XI. Observability & Operability
Every service (backend, frontend, infrastructure) MUST emit structured logs for errors and key
business events, and MUST expose a health-check endpoint or equivalent liveness signal usable by
the deployment environment (see `docker-compose*.yml`). Configuration MUST be sourced from
environment variables (`.env*` files) rather than hard-coded values. Rationale: multi-environment
deployments (dev/prod compose files) require consistent, inspectable runtime behavior without
code changes between environments.

### V. Observability & Operational Readiness

Structured JSON logging on the backend, with a correlation/request ID propagated end-to-end. print() debugging MUST NOT reach main. OpenTelemetry tracing spans the full path — FastAPI → PostgreSQL → any external LLM/RAG call — exported to local loging folder with tracing.log file. 

'''Prometheus/Grafana/Loki/Jaeger. Routing telemetry here (rather than a bespoke stack) means it lands in the same tools your production-debugging-assistant already correlates against, so a production incident on EduVeda is triageable by the same Slack-based RCA workflow instead of a one-off.'''

Every service exposes /healthz (liveness) and /readyz (readiness) for Kubernetes probes. Critical paths (question generation, leaderboard reads) have defined SLOs with burn-rate alerting, not just static thresholds.

Rationale: without correlation IDs and consistent tracing, root-causing a production incident becomes guesswork; standardizing on the observability stack you already operate elsewhere means new tooling isn't required to debug this service.

### VI. Frontend Component & State Architecture

Functional components and hooks only — no new class components. Server state is owned by TanStack Query (React Query); client/UI state lives in React state/context or a light store (e.g. Zustand) — no ad hoc global mutable state. Accessibility is WCAG 2.1 AA as the floor, checked with axe-core in CI, with real keyboard navigability — non-negotiable given the platform serves school-age users, often on shared or low-end devices. A component exceeding roughly 300 lines needs a documented reason it wasn't split.

Rationale: without a single sanctioned pattern for server vs. client state, a growing team reinvents data-fetching three different ways within a year. Accessibility here is both a compliance and an equity concern — many students will not be on premium devices or fast networks.

### VII. Simplicity & Modularity
New functionality MUST be added to the existing backend/frontend/infrastructure module boundaries
rather than introducing new top-level services unless justified in writing (problem, alternatives
considered, why a new service is necessary). YAGNI applies: do not add abstractions, dependencies,
or configuration options for hypothetical future needs. Rationale: keeps the monorepo navigable
and avoids unmanaged sprawl across the backend/frontend/infrastructure split.

### XII. CI/CD & Release Engineering

Trunk-based development: short-lived feature branches (under ~3 days), squash-merged into main behind required status checks. The pipeline runs these gates in order, each blocking the next: lint → type-check → unit tests → security scan (SAST + dependency audit) → build → integration tests → container image scan → deploy to staging → smoke test → promote to production. Releases are semantically versioned; every deploy references an immutable, scanned container image tag — :latest is forbidden in production manifests. All Kubernetes manifests/Helm charts are managed as code — no manual kubectl apply against production. Merges require at least one CODEOWNERS approval; changes touching auth, payments, or student data require a second reviewer.

Rationale: gate ordering matters — fail on a 5-second lint error before spending 10 minutes on integration tests. Immutable, scanned images plus IaC turn a rollback into a config change instead of a fire drill.

### VIII. Data Minimization & Minor-Safe Design (NON-NEGOTIABLE)
Collect only what the stated educational purpose requires; no third-party analytics SDK that builds a cross-site profile of a student user.
Every data category has a defined retention period with automated deletion/anonymization — not indefinite retention "just in case."
Verifiable parental/guardian consent is captured and auditable wherever required for users under the applicable age threshold. India's DPDP Act, 2023 and its Rules, 2025 are the binding reference: the Rules were notified in November 2025 and phase in substantive obligations — including verifiable consent for children's data, breach notification, and security safeguards — on a schedule running through May 2027. Build to the substantive requirement now rather than waiting for the compliance deadline to force a redesign. (This is an engineering compliance target, not legal advice — confirm final scope with counsel.)
No targeted advertising, dark patterns, or engagement-maximizing design (manipulative streaks, guilt-based notifications) aimed at children.
AI-generated content (practice questions, RAG outputs) is reviewed for age-appropriateness and correctness before being shown to a student, then persisted and reused rather than regenerated on demand — this is already the Phase 1 architecture decision and MUST remain the pattern going forward, since on-demand regeneration would remove the review checkpoint.

Rationale: a K-12 platform carries materially higher regulatory and reputational risk per data incident than a typical consumer app; DPDP compliance readiness needs a multi-quarter lead time, not a scramble in the quarter a provision takes effect.

### IX. Performance & Scalability Budgets
API: p95 latency under 300ms for CRUD reads; a separate, explicit p95 budget of under 2s for LLM/RAG-backed endpoints, measured in production — generative calls are held to their own budget rather than silently dragging down the CRUD SLO or being let off the hook entirely.
Frontend: Lighthouse performance score ≥90 on the student dashboard; initial JS bundle under 250KB gzipped; routes are code-split.
Database: no N+1 queries merged (enforced via a query-count assertion in tests or ORM query logging in CI); any column used in a WHERE/JOIN on a table expected to exceed 100k rows requires an index before merge.
Load testing (k6 or Locust) is required before shipping any feature expected to see concurrent spikes (e.g., a leaderboard during a live class).

Rationale: without an explicit, separate budget for AI-backed endpoints, teams either over-promise on generative latency or use it as an excuse to let ordinary CRUD paths regress unnoticed.

## Project stracture

### UI stracture
frontend/
— React (Vite SPA), TypeScript

Exactly 5 top-level folders under `src/`. Each has one clear purpose; a new page or shared
concern must fit into one of these — no ad-hoc top-level folders.

```
frontend/
├── src/
│   ├── app/                     # bootstrap & routing only — nothing feature-specific
│   │   ├── main.tsx             # entry point
│   │   ├── App.tsx              # root providers (QueryClient, ThemeProvider, etc.)
│   │   ├── routes.tsx           # route table
│   │   ├── queryClient.ts       # TanStack Query client config
│   │   ├── vite-env.d.ts
│   │   └── guards/              # route guards (ProtectedRoute, RequireAcademicProfile...)
│   ├── pages/                   # one entry per route
│   │   ├── <Name>.tsx           # flat file — default for a page with no extra page-only files
│   │   └── <Name>/              # folder — only when the page owns extra files
│   │       ├── <Name>.tsx
│   │       ├── <ExtraFile>.tsx  # page-only component/helper
│   │       └── index.ts         # barrel: export { <Name> } from "./<Name>"
│   ├── shared/                  # anything used by 2+ pages, plus all data/API access
│   │   ├── components/
│   │   │   ├── ui/              # design-system primitives (button, card, input, dialog...)
│   │   │   └── <Feature>/       # shared multi-file components (AppShell, SearchableSelect...)
│   │   ├── hooks/                # useAuth, useApi, usePagination, useSessionQuery...
│   │   ├── services/
│   │   │   ├── api/
│   │   │   │   ├── client.ts        # base http client
│   │   │   │   ├── interceptor.ts   # request/response interceptors, refresh-token logic
│   │   │   │   ├── middleware/      # auth.ts, request.ts
│   │   │   │   └── v1/              # versioned endpoint functions, one file per backend resource
│   │   │   └── <name>Service.ts     # thin business-logic wrapper over api/, imported by pages
│   │   ├── store/                # global client state (e.g. authStore) — server state lives in TanStack Query, not here
│   │   ├── schemas/               # zod validation schemas
│   │   ├── types/                 # shared TypeScript types
│   │   ├── theme/                 # tokens, ThemeProvider, ThemeToggle, dark/light
│   │   ├── data/                  # static reference data (dropdown options, security questions...)
│   │   └── utils/                 # cn, dateUtils, storage, validations, response...
│   ├── styles/                   # global CSS — Tailwind entry, design tokens
│   └── assets/                   # static images/fonts/icons
├── tests/
│   ├── unit/                     # Vitest + React Testing Library — mirrors src/ one-for-one
│   │   ├── app/, pages/, shared/ # tests/unit/<path>/<Name>.test.ts(x) ↔ src/<path>/<Name>.ts(x)
│   │   └── support/              # test-only helpers that are not tests themselves (e.g. a11y.ts)
│   ├── test-utils.tsx             # shared render-with-providers test helper
│   └── e2e/                       # Playwright end-to-end journeys
├── index.html                    # references /src/app/main.tsx
├── vite.config.ts
├── tsconfig.json
├── eslint.config.*
└── package.json
```

Placement rule of thumb: if a component/hook/util is currently useful to exactly one page, keep
it colocated with that page (promote the page from a flat file to a folder); the moment a second
page needs the same logic, move it into the matching `shared/` subfolder. See
`frontend/src/README.md` for the full guide with a worked example, and `frontend/tests/README.md`
for the test-mirroring convention.

### FastAPI stracture

backend/
├── src/
│   ├── main.py                  # app factory, middleware registration, router mount
│   ├── app.py  
│   ├── api/
│   │   └── v1/                  # version the API from day one
│   │       ├── endpoints/       # auth.py, users.py, courses.py — thin handlers only
│   │       └── router.py
│   ├── core/
│   │   ├── config.py            # pydantic Settings — one typed source for all env vars
│   │   ├── security.py          # JWT issue/verify, password hashing
│   │   └── logging.py
│   ├── models/                  # SQLAlchemy ORM models
│   ├── schemas/                 # pydantic request/response schemas — never the ORM models directly
│   ├── services/                # business logic — the only layer allowed to make decisions
│   ├── repositories/            # data-access layer — the only layer allowed to query the DB
│   ├── db/
│   │   ├── session.py
│   │   └── base.py
│   ├── dependencies/            # Depends() providers — current_user, db_session, pagination
│   ├── middleware/
│   └── utils/
├── alembic/                     # migrations, one per schema change, reviewed like code
├── tests/
│   ├── unit/                    # services + repositories, DB mocked or in-memory
│   ├── integration/             # real test DB via testcontainers
│   └── conftest.py
├── scripts/                     # seed data, one-off maintenance tasks
├── Dockerfile
├── pyproject.toml
└── alembic.ini

## Technology & Security Standards

Backend services MUST use the dependency and build tooling already declared in each service's
manifest (e.g., `pyproject.toml`/`uv.lock` for Python services) rather than introducing a second
package manager for the same language. Secrets and credentials MUST NOT be committed to the
repository; local secrets belong in `.env` (gitignored) and are never copied into `.env.example`.
Production configuration (`docker-compose.prod.yml`) MUST NOT reference development-only secrets
or debug flags. Dependency updates that touch security-sensitive libraries (auth, crypto, HTTP
parsing) MUST be called out explicitly in the pull request description.


### Technology Stack & Constraints
Backend: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), Alembic for migrations, PostgreSQL 15+, Redis for caching/rate-limiting. Ruff for lint + format (replacing a separate Black/Flake8/isort stack), mypy --strict.
Frontend: React 18+, TypeScript 5+ (strict), Vite, TanStack Query, React Router, ESLint + Prettier, Vitest + React Testing Library + Playwright.
AI/RAG layer: all model calls (Hugging Face models, commercial LLMs, vector-store retrieval) route through a single internal gateway service rather than being called ad hoc from feature code, so provider swaps, rate limits, and cost tracking stay centralized.
Infrastructure: Docker multi-stage builds, non-root container user, slim/distroless base images; Kubernetes via Helm charts; GitHub Actions for CI/CD; Trivy for image scanning.

### Development Workflow & Quality Gates
Branching: trunk-based; feature branches off main; CI must be green before merge; no direct pushes to main.
Definition of Done: code merged, tests passing, OpenAPI/docs updated, no new lint/type debt introduced, and reviewed against the principles above.
Spec Kit integration: every /speckit.plan MUST include a Constitution Check confirming alignment with Principles I–IX. Any deviation is recorded in a Complexity Tracking section of the plan naming the specific principle, why it can't be met as written, and how the gap will close — silent deviation is not permitted.
Code review: reviewers check against a short checklist mapped 1:1 to the principles (e.g. "no new any or untyped dict crossing a boundary?", "does this endpoint have a p95 budget?").
Infrastructure changes (Docker, compose files, deployment scripts) MUST
be validated locally (`docker-compose config` or equivalent) before merge. Merges that bypass
these gates require an explicit, documented exception approved by a maintainer.

## Governance

This constitution supersedes ad-hoc conventions when they conflict. Amendments require: (1) a
written proposal describing the change and rationale, (2) update of this file with a version bump
per the policy below, and (3) review/approval before merge, same as any other change. Compliance
with these principles MUST be verified during code review; reviewers MAY request changes solely on
the basis of a principle violation.

Amendment procedure: proposed via PR to this file. Requires sign-off from the tech lead/ architect and at least one other senior engineer. Spec Kit's /speckit.constitution command may mechanically fill placeholders and bump the version number, but a human MUST review the resulting diff before merge.
Versioning policy (semantic versioning): MAJOR for a backward-incompatible removal or redefinition of a principle; MINOR for a new principle or a materially expanded section; PATCH for wording clarifications and typo fixes.
Compliance review: every /speckit.plan and /speckit.tasks run is checked against this document via /speckit.analyze. A flagged drift blocks proceeding to /speckit.implement until it is resolved or explicitly justified in the plan's Complexity Tracking section.

This Constitution takes precedence over any ad hoc conventions in the event of a conflict. Any amendment must follow a formal process that includes: (1) a documented proposal outlining the proposed change and its justification, (2) an update to this document with the appropriate version increment as defined in the versioning policy, and (3) review and approval prior to merge, consistent with the standard change management process. Adherence to these principles is mandatory and must be validated during code reviews. Reviewers may request changes solely on the basis of non-compliance with any constitutional principle.

Amendment Process: All amendments must be proposed through a pull request (PR) against this document. Approval requires sign-off from the Tech Lead or Architect, along with at least one additional senior engineer. While the /speckit.constitution command may automate placeholder population and version number updates, all generated changes must undergo human review before being merged.

Versioning policy (semantic versioning applied to governance):
- MAJOR: Backward-incompatible governance changes, e.g., removing or redefining a principle.
- MINOR: New principle or materially expanded section added.
- PATCH: Wording clarifications, typo fixes, non-semantic refinements.

Compliance Verification: Every /speckit.plan and /speckit.tasks execution must be validated against this Constitution using /speckit.analyze. Any identified drift or non-compliance must be addressed before proceeding to /speckit.implement, unless an explicit justification is documented in the plan's Complexity Tracking section.

**Version**: 1.0.2 | **Ratified**: TODO(RATIFICATION_DATE) | **Last Amended**: 2026-09-15

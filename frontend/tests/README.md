# Frontend test structure

`frontend/tests/unit/` is a single, centralized test directory that **mirrors `frontend/src/`
one-for-one** — tests are never colocated next to the source files they test.

**Convention**: a test for `src/<path>/<Name>.ts(x)` lives at `tests/unit/<path>/<Name>.test.ts(x)`.

Example: `src/pages/Login.tsx` → `tests/unit/pages/Login.test.tsx`.
Example: `src/shared/hooks/useAuth.ts` → `tests/unit/shared/hooks/useAuth.test.tsx`.

Shared test helpers that aren't tests themselves (e.g. the axe-core a11y assertion helper, or
provider-wrapping render helpers) live in `tests/support/` and `tests/test-utils.tsx` respectively
— not inside `tests/unit/`, so they're never mistaken for a test file.

`frontend/tests/e2e/` (Playwright) is a separate, unaffected top-level test directory for
end-to-end journeys and is not part of this mirroring convention.

# Continuous Integration (CI)

This document describes the automated CI pipeline defined in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml). See
`specs/014-ci-build-test-pipeline/` for the full spec, plan, and design
rationale behind these decisions.

## Triggers

| Event | Filter |
|-------|--------|
| `push` | Any branch (no filter) |
| `pull_request` | Only PRs targeting `main` |

Only one CI run is active at a time per branch/ref: pushing a new commit to a
branch (or updating a PR) automatically cancels the previous, now-superseded
run for that same `ref` (`concurrency` group `ci-${{ github.workflow }}-${{ github.ref }}`).

## Jobs

The pipeline runs two independent jobs, both on the project's **self-hosted**
runner, each with a **15-minute** timeout. Neither job depends on
(`needs:`) the other, so a failure in one is always reported without hiding
or blocking the other's result.

### `backend`

Builds a CI-only container from `backend/Dockerfile`'s `ci` target (adds the
`dev` dependency group — ruff, mypy, pytest, pip-audit, bandit — on top of the
same production dependency set the `runtime` target uses, all resolved from
the same `backend/uv.lock` via `--frozen`), then runs, in order:

1. Lint — `ruff check .`
2. Type-check — `mypy --strict src`
3. Unit tests — `pytest --cov`
4. Security scan — `pip-audit` and `bandit -r src`
5. Build — `docker build --target runtime` (the actual production image)

### `frontend`

Builds a container from `frontend/Dockerfile` (which now uses `npm ci` for a
lockfile-exact, reproducible install), then runs, in order:

1. Lint — `npm run lint` (eslint)
2. Type-check — `tsc -b`
3. Unit tests — `npm run test:coverage` (vitest)
4. Security scan — `npm audit --audit-level=high`
5. Build — `npm run build`

## Required status checks

Branch protection on `main` should require both of these checks to pass
before merging:

- `backend`
- `frontend`

(Configured under **Settings → Branches → Branch protection rules** for
`main`; this is a manual, one-time repository setting — see T033 in
`specs/014-ci-build-test-pipeline/tasks.md`.)

## Reproducibility

- `backend/Dockerfile` and `frontend/Dockerfile` both pin their base images
  to an exact digest (not a floating tag), so the same commit always builds
  from the same base image.
- Neither job shares a volume or cache mount with the other, so one app's
  dependencies can never leak into the other's build/test run.

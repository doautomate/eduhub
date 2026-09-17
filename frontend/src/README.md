# Frontend source structure

This app's `src/` has exactly **5 top-level folders**. Each has one clear purpose — if you're not sure
where something goes, find its category below.

| Folder | Purpose | When you add new code here |
|---|---|---|
| `app/` | Application bootstrap & routing wiring only — `main.tsx`, `App.tsx`, `routes.tsx`, `queryClient.ts`, `guards/`. Nothing feature-specific lives here. | Only when adding a new route entry, a new global provider, or a new route guard. |
| `pages/` | One entry per route (a **Page**). | Adding a new page. See "Adding a new page" below. |
| `shared/` | Anything used by **2 or more pages** (a **Shared Component/Hook/Utility/...**), plus all data/API access code. | Adding something a second page needs, or any API call. |
| `styles/` | Global CSS (Tailwind entry, design tokens). | Rare — global stylesheet changes only. |
| `assets/` | Static files (images, fonts, icons). | Adding a new static asset. |

## Where does my file go?

- **A new page** → `pages/<Name>.tsx` (flat file). Import it as `pages/<Name>` either way.
- **A component only that one page uses** → promote the page to a folder:
  `pages/<Name>/<Name>.tsx` + `pages/<Name>/<ExtraFile>.tsx` + `pages/<Name>/index.ts` (barrel:
  `export { <Name> } from "./<Name>";`). See `pages/Home/` and `pages/Register/` for real examples.
- **A component/hook/utility used by 2+ pages** → `shared/components/`, `shared/hooks/`, or
  `shared/utils/`. This is a **judgment call**, not a strict numeric rule — if you're duplicating
  logic across a second page, that's usually the signal to move it here. There's no required
  waiting period; move it when it stops being one page's exclusive concern.
- **Code that talks to the backend** → `shared/services/`. Two layers:
  - `shared/services/api/` — the low-level HTTP client (`client.ts`, `interceptor.ts`,
    `middleware/`) and versioned endpoint functions (`api/v1/*.ts`), one file per backend resource.
  - `shared/services/*Service.ts` — thin business-logic wrappers around the `api/` layer that
    pages actually import.
- **Cross-cutting design-system pieces** (buttons, cards, dialogs, ...) → `shared/components/ui/`.
- **Global client/auth state** → `shared/store/`. **Server state** is owned by TanStack Query via
  `app/queryClient.ts` — don't duplicate server data into `shared/store/`.
- **Validation schemas** (zod) → `shared/schemas/`. **TypeScript types** → `shared/types/`.
- **Theme (light/dark, tokens)** → `shared/theme/`. **Static reference data** (dropdown options,
  security questions, etc.) → `shared/data/`.
- **Tests** → never colocated with source. See `frontend/tests/README.md` — every test's path
  mirrors its source file's path one-for-one under `frontend/tests/unit/`.

## Adding a new page (worked example: "Bookmarks")

1. One file, no extra pieces yet → `pages/Bookmarks.tsx`. Add it to `app/routes.tsx`.
2. Say `Bookmarks` grows a list component that only it uses → promote to a folder:
   - `pages/Bookmarks/Bookmarks.tsx` (moved from the flat file)
   - `pages/Bookmarks/BookmarksList.tsx` (the new page-only component)
   - `pages/Bookmarks/index.ts` → `export { Bookmarks } from "./Bookmarks";`
   - `app/routes.tsx`'s import path (`pages/Bookmarks`) doesn't need to change — folder and flat
     file are imported identically.
3. Say it also needs to fetch a list of bookmarks from the backend:
   - `shared/services/api/v1/bookmarks.ts` — the endpoint function(s), following the pattern in
     `shared/services/api/v1/users.ts`.
   - `shared/services/bookmarkService.ts` — a thin wrapper, following `shared/services/userService.ts`.

No new top-level folder was needed for any of this — everything fit inside the existing 5.

## Shared vs. feature-specific (the judgment call)

There's no strict numeric trigger (e.g. "used 3 times → must move"). The concept: if a piece of
code is currently useful to exactly one page, keep it colocated with that page; the moment a
second page genuinely needs the same logic, move it into the matching `shared/` subfolder rather
than copy-pasting. Reviewers should flag obvious duplication, but the exact timing is a developer
judgment call, not a rule to mechanically enforce.

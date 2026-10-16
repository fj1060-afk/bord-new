@AGENTS.md

# Bord (مجلس)

Arabic, right-to-left platform for board and committee governance, rebuilt from scratch.
The build plan and its status live in `src/config/phases.ts` (shown on the home page) and `docs/PLAN.md`.

## Commands

- `pnpm dev`: local server
- `pnpm check`: lint, typecheck and tests (run before every push; CI runs the same plus `pnpm build`)

## Conventions

- Stack: Next.js App Router, TypeScript, Tailwind v4, Supabase (Postgres, Auth, Storage).
- UI text is Arabic. Layout is RTL: use logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`), never `left`/`right`.
- Numbers and dates use Latin digits via `src/lib/format.ts`; dates are in `Asia/Riyadh`.
- Colors and fonts come only from the tokens in `src/app/globals.css` (`bg-primary`, `text-brass`, `font-display`, ...).
- Page permissions (and the roles editor) are defined once in `src/config/navigation.ts`; the sidebar layout, with the board and each committee as sections, is `src/config/sidebar.ts`. Pages not built yet render through the `[...section]` placeholder route.
- Schema changes go in `supabase/migrations/` (see its README). Authorization is enforced in the database with RLS, not only in the UI.
- Keep files small and focused (aim for under 400 lines). Pure logic goes in `src/lib` with a `*.test.ts` next to it.
- Cache Components is deliberately off: pages depend on the signed-in user.
- Page access: guard every page with `requirePage(href, level)` from `src/lib/auth.ts` and every server action with the level it needs; the database enforces the same rules through `page_level()` in RLS policies.
- The Supabase MCP `apply_migration` times out on statements it treats as destructive (`revoke`, `delete`); put those in a migration the user runs from the SQL editor.
- Server components must not call functions exported from a `"use client"` file (they become client references and throw at runtime). Shared helpers like `buttonClass` live in `src/components/ui/styles.ts`.
- RLS policies must not look up their own table by id (e.g. `can_view_x(id)`): the row being inserted is not visible yet, so `insert … select` fails. Check the row's columns directly.

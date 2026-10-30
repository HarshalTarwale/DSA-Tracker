# DSA Tracker

A personal, password-protected web app for a 16-week DSA placement-prep plan in Python.

- **Who:** one user (Aaditya), B.Tech ECS, preparing for internship tests from Feb 2027 and final placements at the end of 2027, targeting 24–48 LPA roles.
- **Plan:** 5 Nov 2026 → 24 Feb 2027, 3 hours a day. 25 topics ordered by how often companies test them, 252 curated LeetCode problems (58 Easy / 162 Medium / 32 Hard), a day-by-day schedule with a review day every 7th day (six of them timed mocks) and a +1 / +7 / +30-day spaced-repetition rule.
- **Why:** it replaces an Excel tracker that was slow to update. Logging progress takes one or two clicks, and the Dashboard answers "am I on track?".

All plan content comes from [`data/seed-data.json`](data/seed-data.json).

**Stack:** Next.js 16 (App Router, Server Components, Server Actions) · TypeScript strict · Tailwind CSS v4 + shadcn/ui-style components · Recharts · Postgres on Neon · Drizzle ORM · zod · jose (JWT session) · date-fns + @date-fns/tz · sonner · exceljs · vitest.

## Pages

| Route | What it does |
|---|---|
| `/` | Dashboard: KPIs, ahead/behind banner, planned-vs-actual chart, heatmap, weekly bars, topic chart, how-you-solve, topic table, weak spots |
| `/today` | Today's focus, problem checklist (key idea hidden until clicked), carry-over, redos due, day log |
| `/schedule` | 112 days grouped by week, today highlighted and scrolled into view, day-log toggles |
| `/problems` | Search, filters and sort (kept in the URL), inline status/how/time/star/timer, edit sheet, add custom problem |
| `/topics`, `/topics/[id]` | Topic cards and topic detail (daily focus, problems, stats, company importance) |
| `/revision` | Overdue / due today / upcoming 7 days, "Redo done", Attempted backlog |
| `/mistakes` | Mistake Log with pattern-trigger cheat sheet |
| `/mocks` | Mock log, solve-rate chart, mock days from the plan |
| `/companies`, `/guide` | Company tiers and importance matrix; how to use, rules, status meanings |
| `/settings` | Start date, daily hours, export (JSON / XLSX / CSV), import backup, reset, log out |

Keyboard: `g` then `d/t/p/r/s/m` to navigate, `/` to search problems, `?` for help.

## Local setup

```bash
npm i
cp .env.example .env.local      # then fill in the three values
npm run db:migrate              # creates the tables (drizzle/0000_init.sql)
npm run db:seed                 # 25 topics, 252 problems, 112 days
npm run dev
```

`.env.local` needs:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `APP_PASSWORD` | The password you log in with |
| `AUTH_SECRET` | At least 32 random characters: `openssl rand -base64 32` |

Other scripts: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run db:generate` (after schema changes), `npm run db:push`, `npm run db:studio`.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Create a Neon project at [neon.tech](https://neon.tech) (or in Vercel: **Storage → Marketplace → Neon**).
3. Copy the **pooled** `DATABASE_URL` (the host contains `-pooler`).
4. From your machine, run the migration and seed once against it:
   ```bash
   DATABASE_URL="postgresql://…-pooler…/neondb?sslmode=require" npm run db:migrate
   DATABASE_URL="postgresql://…-pooler…/neondb?sslmode=require" npm run db:seed
   ```
   (Or put it in `.env.local` and run the two commands.)
5. In Vercel, **Add New → Project**, import the repo, and under **Environment Variables** set `DATABASE_URL`, `APP_PASSWORD` and `AUTH_SECRET` (generate with `openssl rand -base64 32`).
6. Click **Deploy**.
7. Open the site, log in, and check **Settings → Start date** (default 5 Nov 2026).

To install it on your phone: open the site in Chrome/Safari and use "Add to Home screen".

## Backups

**Settings → Export → JSON backup** downloads every table. Do this weekly and keep the file somewhere safe. **Settings → Import backup** shows a preview of the counts, then restores progress (problems are matched by LC number; custom problems by id or LC number, or re-created).

XLSX export has the sheets Dashboard, Problems, Schedule (with dates and day logs), Mistakes and Mocks. CSV export is the problem list.

## Re-running the seed is safe

`npm run db:seed` upserts topics and planned problems (plan fields only: title, URL, difficulty, topic, key idea, order), rebuilds the schedule tables, and inserts settings only if missing. It never touches status, dates, how, time, redo dates, notes, day logs, events, mistakes, mocks or custom problems. It asserts 25 / 252 / 112 at the end.

## Decisions

- **Cache Components turned off.** `create-next-app` enabled `cacheComponents` + `partialPrefetching`. Every page here reads the session cookie and live progress, so the app uses fully dynamic rendering (`export const dynamic = "force-dynamic"`, which Cache Components does not allow). The React Compiler stays on.
- **`src/` layout.** The generated project had `app/` at the root; it was moved to `src/app` and the `@/*` alias now points to `./src/*`, matching the spec's folder structure. `data/seed-data.json` is a copy of `Project Content/seed-data.json`.
- **`@types/node` bumped to v22** so vitest 5 installs without peer-dependency conflicts (Node 22 is what runs it).
- **Env validated lazily.** `src/lib/env.ts` validates with zod on first use instead of at import, so `next build` works without secrets; any request that needs the DB or auth fails with a clear message if a variable is missing.
- **UI components** are shadcn/ui-style source files written against the unified `radix-ui` package and the project's own tokens (no CLI run). `components.json` is included so `npx shadcn add …` works later. Note: shadcn normally uses `accent` for hover backgrounds; here `--accent` is the brand blue per the spec, and hovers use `card-hover`.
- **Redo completions log one event.** "Redo done" writes a single `redo_done` event (with from/to status) rather than an extra `status_change`, so one action counts once in the streak and heatmap.
- **Plan fields** (title, URL, difficulty, topic, key idea, LC #) are editable only on custom problems; the seed owns them for planned problems and would overwrite edits.
- **Reverting to Not started** clears date solved, how, time and redo dates (per spec) but keeps notes and the redo star.
- **Reset progress** keeps custom problems (only their progress is cleared), since they are plan rows you created.
- **Import** creates any missing custom problems first, then restores everything else in one atomic `db.batch`.
- **Day logs** have no foreign key to `schedule_days`, so they survive the seed rebuilding the schedule.
- **Unauthenticated Server Action calls** are stopped by `proxy.ts` (redirect to `/login`, 401 for `/api/*`); every action, route handler and the `(app)` layout also verify the JWT.
- **Status control:** a 4-way segmented control on Today and topic pages, a compact dropdown (with the meaning of each status) on the dense Problems and Revision lists.
- **No service worker.** Current Chrome/Edge/Safari install the app from the manifest alone, and the spec forbids caching data. Manifest icons are generated at `/icons/192` and `/icons/512`.
- **Timer state** lives in `localStorage` (`dsa-timer:v1`) and syncs across tabs; one timer at a time.
- **Not-found inside the app** streams with HTTP 200 (the route has a loading boundary), and renders the 404 page inside the app shell.

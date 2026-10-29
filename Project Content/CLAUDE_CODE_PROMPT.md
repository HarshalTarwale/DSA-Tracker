# Build "DSA Tracker": a personal DSA placement-prep tracker (Next.js + Postgres, deployed on Vercel)

You are building a complete, production-quality web app in this repository in one go. Read this entire document before writing any code. Work autonomously: do not stop to ask questions. When something is ambiguous, pick the most sensible option, keep going, and note the decision in `README.md` under "Decisions". Do not stop until every item in **Section 15 (Acceptance criteria)** passes.

---

## 1. Context: who this is for and how we got here

**The user:** Aaditya, a B.Tech (Electronics & Computer Science) student in Nagpur, India, and a working full-stack developer.

**The goal:** master DSA and problem-solving in **Python** for campus placements.
- Internship placement tests and interviews start around **February 2027**.
- Final placements (campus and off-campus) are at the **end of 2027**.
- The target is a 24–48 LPA software role in India.
- The study budget is **3 hours a day, starting 5 November 2026**.

**What already exists** (from a planning conversation):

1. **Research on what companies test.** Companies fall into three tiers:
   - **Tier A, mass recruiters** (TCS, Infosys, Wipro…): arrays, strings, searching, sorting, hashing, linked lists, stacks. Easy to easy-Medium.
   - **Tier B, mid-size product companies and startups** (Zoho, Freshworks…): Tier A plus linked-list operations, stacks/queues, basic trees, HashMap, two pointers, sliding window. Medium.
   - **Tier C, top product companies** (Amazon, Microsoft, Google, Flipkart, Uber, Atlassian…): all of the above plus dynamic programming, graphs, advanced trees, backtracking and greedy. Medium to Hard.
2. **A 16-week plan** (5 Nov 2026 to 24 Feb 2027) built from that research:
   - 25 topics ordered by how often companies test them.
   - 252 curated LeetCode problems: 58 Easy, 162 Medium, 32 Hard.
   - A day-by-day schedule. Every 7th day is a review day, and six of those review days are timed mocks. The last 8 study days are revision and mocks.
   - A spaced-repetition rule: redo at +1, +7 and +30 days.
3. **An Excel tracker** with these sheets:
   - Dashboard: E/M/H target vs solved per topic, KPIs, chart.
   - Schedule: day by day.
   - Problems: status, date, how, time, redo flag, redo dates, notes.
   - Company Needs.
   - Mistake Log.
   - Start Here: rules and how to use.

   The user found spreadsheet updates slow and awkward. **This app replaces the spreadsheet.** It must keep every feature of the sheet, make logging progress fast (one or two clicks), and show clearly whether the user is on track.

**All plan content is in `data/seed-data.json`** in this repo. Never invent problems or topics. Seed from that file. Its shape is documented in Section 6.

**Single user.** Only Aaditya uses this app. It is public on the internet, so it must be password-protected. No multi-user system or sign-up.

---

## 2. Tech stack (use exactly this unless the installed project forces otherwise)

The Next.js project was just created with `create-next-app` (TypeScript, ESLint, Tailwind, App Router, `src/` directory, `@/*` alias).

**First, inspect `package.json` and the existing files, then adapt:**
- If Next.js is v16+, follow v16 conventions: `proxy.ts` instead of `middleware.ts`, async `params` / `searchParams` / `cookies()`.
- If Tailwind is v4, use CSS-first config in `globals.css` with `@theme`.

| Concern | Choice |
|---|---|
| Framework | Next.js App Router, React Server Components, Server Actions, TypeScript `strict` |
| Styling | Tailwind CSS + **shadcn/ui** (init it; add only the components used) + `lucide-react` icons |
| Charts | **Recharts** (via shadcn `chart` component wrappers where convenient) |
| Database | **Postgres on Neon** (works with Vercel) via `@neondatabase/serverless` |
| ORM | **Drizzle ORM** + `drizzle-kit` (migrations in `/drizzle`) with the `drizzle-orm/neon-http` driver. For multi-statement atomic writes use `db.batch([...])`. |
| Validation | `zod` for every Server Action input and the backup import |
| Auth | Password from env + signed JWT session cookie using `jose` (Section 9) |
| Dates | `date-fns` + `@date-fns/tz`. **All "today" logic in `Asia/Kolkata`.** |
| Toasts | `sonner` |
| Export | `exceljs` for .xlsx; native CSV and JSON |
| Tests | `vitest` for pure logic |
| Fonts | Geist Sans / Geist Mono (already in create-next-app) |

Do not add other heavy dependencies without a clear need. No Prisma, no NextAuth, no Redux.

---

## 3. Product overview: pages

| Route | Purpose |
|---|---|
| `/login` | Password login |
| `/` | **Dashboard**: progress at a glance, on track or not |
| `/today` | **Today**: today's plan, problem checklist, carry-overs, redo due, day log, timer |
| `/schedule` | 16-week day-by-day plan grouped by week, today highlighted |
| `/problems` | All problems: search, filter, sort, inline status updates, add custom problem |
| `/topics` | 25 topic cards with progress |
| `/topics/[id]` | Topic detail: daily focus, problems, stats, company importance |
| `/revision` | Spaced-repetition redo queue (+1 / +7 / +30) and "Attempted" backlog |
| `/mistakes` | Mistake Log (pattern notebook) with a pattern-trigger cheat sheet |
| `/mocks` | Mock test log + score trend + upcoming mock days |
| `/companies` | Company Needs: tiers, topic-importance matrix, company favourites, sources |
| `/guide` | How to use, status meanings, rules for building logic, pattern triggers |
| `/settings` | Start date, daily hours, export (JSON / XLSX / CSV), import backup, reset progress, logout |

---

## 4. Feature specification (everything below is required)

### 4.1 Problem tracking (replaces the Problems sheet)

Each problem has:
- **Planned fields from seed:** topic, LC number, title (links to the LeetCode URL, new tab), difficulty, key idea / pattern.
- **User fields:**
  - **Status:** `not_started | attempted | solved | revised`. Display as "Not started / Attempted / Solved / Revised".
  - **Date solved:** an IST date, editable.
  - **How:** `alone | hint | solution`.
  - **Time:** minutes.
  - **Redo flag** (starred).
  - **Redo stage completion dates:** `redo1DoneAt`, `redo7DoneAt`, `redo30DoneAt`.
  - **Notes.**

**What counts as done.** A problem counts as solved only when status is **solved or revised**. Attempted does not count. Show the meaning of each status (from `statusMeaning`) as a tooltip.

**Fast updates (critical UX):**
- Inline status control in every list: a segmented control or compact select.
- Updates are optimistic (`useOptimistic` / transitions) with toast feedback.

**Automations:**
- Status changes to solved or revised and `solvedAt` is empty → set `solvedAt` = today (IST).
- How is set to `hint` or `solution` → set the redo flag to true automatically. The user can unset it.
- Status changes back to not_started → open a confirm dialog, then clear `solvedAt`, `how`, `timeMinutes` and all redo stage dates.
- Every status change and every redo completion writes a row to `activity_events` (used by streak, heatmap and charts).

**Custom problems.** The user can add their own problems with topic, title, optional LC number, optional URL, difficulty and key idea. They are flagged `isCustom`. They count toward topic **targets and solved** totals, exactly like the Excel version. They are excluded from the plan curve and the ahead/behind calculation.

**Edit drawer.** Clicking a row opens a side sheet with every field editable, plus the redo timeline and the timer.

**Problems page:**
- Search by title or LC number.
- Filters: topic, difficulty, status, redo flag, "redo due", custom.
- Sort by plan order, difficulty, date solved or time.
- Counts summary at the top.
- Filters persisted in URL search params.

### 4.2 Spaced repetition / revision (replaces the redo columns)

- Redo due dates are derived as `solvedAt + 1`, `solvedAt + 7` and `solvedAt + 30` days. They are not stored.
- A problem is **in the redo queue** when `redoFlag = true`, `solvedAt` is set, and at least one stage is not done.
- Its **next stage** is the earliest stage whose done date is null.
- That stage is **due** when its due date is on or before today (IST), and **overdue** when its due date is before today.
- **/revision** shows three sections: **Overdue**, **Due today** and **Upcoming 7 days**. Each item has a "Redo done" button.
  - The button sets that stage's done date to today and sets status to `revised`. Show a toast.
  - Also show an "Attempted backlog" section: problems with status attempted, oldest first.
- When all three stages are done, show a "Mastered" badge on the problem (derived).
- The sidebar or bottom nav shows a badge with the count of overdue plus due-today items.

### 4.3 Schedule (replaces the Schedule sheet)

The schedule comes from seed `schedule` (112 entries, `dayIndex` 0–111).

**Dates and today.**
- Each day's **date = settings.startDate + dayIndex**. Changing the start date in Settings shifts the whole plan.
- `todayIndex = differenceInCalendarDays(todayIST, startDate)`.

**Day types:**
- **`study`** has a topic, a focus (the concept to learn first) and a list of problems (`problemIds` are **LC numbers**; map them to problem rows on seed).
- **`review`** is the weekly review and contest.
- **`mock`** is a timed mock plus review.
- **`final`** is a revision or mock task.

**Day log.** Each day can be logged with:
- Status: `yes | partial | skipped`
- Hours spent
- Notes

**/schedule page:**
- 16 week sections ("Week 1 · 5–11 Nov"), each with day cards showing date, weekday, type badge, topic, focus and problem chips coloured by difficulty and status.
- The day log status control sits on each card.
- Today's card is highlighted and auto-scrolled into view.
- Past days that are not logged show a subtle "not logged" hint.
- Review and mock days get a distinct style.

### 4.4 Today page (the daily driver; must be excellent on mobile)

**Header:** date, "Day N of 112", week number, phase, day type.

**Before the plan starts:** show a countdown and a preview of Day 1.

**After the plan ends:** show "Plan complete" with the redo queue, the weakest topics, and a suggestion to keep doing weekly contests.

**Study day:**
- Focus card: what to learn first.
- Problem checklist with inline status, how, time and redo star, plus the key idea revealed on click (hidden by default so the user thinks first).
- **Carry over:** problems from earlier study days (`dayIndex < todayIndex`, not custom) that are not solved or revised, collapsed with a count.
- **Redo due today and overdue:** compact list with "Redo done".
- **Day log:** status, hours and notes. When every problem of today is solved or revised, show a gentle "Mark today as done?" prompt. Do not auto-set it.

**Review, mock and final days:** show the focus text, today's redo queue, the Attempted backlog, and for mock days a quick button "Log a mock test".

**Timer (Section 4.10)** is available from each problem row.

### 4.5 Dashboard (replaces the Dashboard sheet; must answer "am I progressing?")

**KPI cards (top row):**
- Solved / Target
- Overall % (progress ring)
- Easy, Medium, Hard as solved / target with thin bars in difficulty colours
- Plan end date (startDate + 111)
- Days left (`max(0, endDate − today)`)
- **Pace needed / day** (`remaining / daysLeft`, 1 decimal, guard divide-by-zero)
- **Current streak** and longest streak

**On-track banner:**
- `plannedByYesterday` = number of planned (non-custom) problems on study days with `dayIndex < todayIndex`.
- `solvedPlanned` = planned problems that are solved or revised.
- `delta = solvedPlanned − plannedByYesterday`.
- Text: "You are **X ahead** of plan" (green), "**On track**" (`delta == 0`), or "**X behind** plan, about Y extra per day for a week clears it" (amber, or red if behind by more than 10).
- Before the start date: "Plan starts in N days".

**Charts:**
1. **Planned vs actual (cumulative).** A line chart over plan dates. The planned line is the cumulative count of problems scheduled through each day. The actual line is the cumulative solved count, using the first `solvedAt` per planned problem, up to today. This is the main "am I progressing" chart.
2. **Solved per week:** bars per plan week, with Easy, Medium and Hard stacked.
3. **Activity heatmap:** a GitHub-style grid covering the plan range plus a little before. Intensity is the number of counted events per IST date (solves and redo completions). Tooltip shows date and count.
4. **Target vs solved by topic:** a horizontal bar chart of all 25 topics in plan order.
5. **How you solve:** a small donut of alone vs hint vs solution for solved problems, plus average minutes per difficulty.

**Topic table** (same columns as the Excel sheet):

| Column | How it is computed |
|---|---|
| # | Plan order |
| Topic | Links to the topic page |
| Priority | P1 / P2 / P3 badge |
| Start / End | First and last study date for the topic |
| Study days | Number of study days for the topic |
| Target E / M / H / Total | Counts in the topic, including custom problems |
| Solved E / M / H / Total | Solved or revised counts |
| % complete | Shown as a bar |
| Remaining | Target total − solved total |
| Status | Not started / In progress / Completed |

The table also has a totals row.

**Weak spots card:** the 3 topics with the lowest % among topics whose end date has passed. Before any topic has ended, show the topics currently in progress.

### 4.6 Topics

- **/topics:** a grid of 25 cards. Each shows the priority badge, a progress ring, E/M/H mini bars, the date range, status, and Tier A/B/C importance dots (0–3).
- **/topics/[id]:**
  - Daily focus list (from `dailyFocus` with the matching dates).
  - Problem list with inline status.
  - Stats: % complete, average time, alone vs hint vs solution.
  - Company importance for this topic.

### 4.7 Mistake Log (replaces the Mistake Log sheet)

**Fields:**
- Date (default today IST)
- Problem: pick from problems via a searchable combobox, or free text
- Topic: auto-filled from the problem, editable
- Pattern / trigger words
- What went wrong
- Correct idea in one line
- Re-solved (bool)

**Page:**
- CRUD, search and topic filter.
- An empty state that shows one example entry (Two Sum: "find a pair with target → store complement in dict"…).
- A right-side (desktop) or collapsible (mobile) **Pattern triggers** cheat sheet from seed `patternTriggers`.

### 4.8 Mock tests

**Log fields:**
- Date
- Title
- Problems attempted
- Problems solved
- Duration in minutes
- Topics covered (multi-select)
- What went wrong
- Notes

**Page:**
- Table of mocks.
- Line chart of solve rate over time.
- **Upcoming mock days** from the schedule (`type = mock`), with dates.

### 4.9 Company Needs, Guide

- **/companies:**
  - Tiers table (`companyTiers`).
  - Topic-importance matrix: 25 topics × Tier A/B/C, as a heat-coloured 0–3 grid with a sum column and the planned days per topic.
  - Company favourites (`companyFavorites`).
  - Sources with external links.
  - A small note: "Importance scores are a judgment-based synthesis, not official company data."
- **/guide:**
  - How to use the app (daily flow).
  - Status meanings.
  - `rules` as cards.
  - `patternTriggers`.
  - A short "Weekly rhythm" explainer: study days, review day, mock days.

### 4.10 Timer, shortcuts, PWA (required, lower priority: build after everything above works)

- **Problem timer:** a start/pause/stop stopwatch per problem.
  - The running state lives in `localStorage` so it survives refresh.
  - A small floating pill shows the running timer on any page.
  - On stop, offer "Add N min to this problem" (adds to `timeMinutes`).
- **Keyboard shortcuts:**
  - `g` then `d` / `t` / `p` / `r` / `s` / `m` navigates to Dashboard / Today / Problems / Revision / Schedule / Mistakes.
  - `/` focuses search on Problems.
  - `?` opens a shortcuts dialog.
  - Ignore shortcuts while typing in inputs.
- **Installable app (PWA):**
  - `app/manifest.ts` with name "DSA Tracker", short name "DSA", black theme and background colour, `display: "standalone"`.
  - Icons generated with `app/icon.tsx` / `app/apple-icon.tsx` (ImageResponse) or static PNGs.
  - Add a minimal service worker only if needed for installability. **Never cache API or data responses.**

### 4.11 Settings, backup, export

- Edit **start date** and **daily study hours**. Show a warning that changing the start date shifts all plan dates.
- **Export:**
  - **JSON backup**: every table.
  - **XLSX**: sheets Dashboard summary, Problems, Schedule (with dates and day logs), Mistakes, Mocks.
  - **CSV**: problems.
  - Implement as route handlers under `/api/export/*`, auth-protected, with `Content-Disposition` attachment.
- **Import backup (JSON):**
  - Validate with zod.
  - Show a preview of the counts.
  - Then restore user progress fields by LC number or custom id, using `db.batch`.
- **Reset progress:** requires typing `RESET`. It clears user fields, events, logs, mistakes and mocks, and keeps plan data.
- **Logout.**

### 4.12 Out of scope

- LeetCode auto-sync. It relies on unofficial endpoints; do not build it.
- Multi-user accounts.
- Social features.

---

## 5. Design system: black theme, clean and professional

The app is **dark only**. Set `<html className="dark">` and `color-scheme: dark`. No theme toggle.

**Palette** (define as CSS variables / Tailwind theme tokens, and use the tokens everywhere, never raw hex in components):

| Token | Value | Use |
|---|---|---|
| `--background` | `#000000` | page |
| `--surface` | `#0A0A0A` | sidebar, header |
| `--card` | `#111111` | cards |
| `--card-hover` | `#161616` | hover |
| `--border` | `#232323` | 1px borders |
| `--muted-foreground` | `#8A8A8A` | secondary text |
| `--foreground` | `#F5F5F5` | primary text |
| `--accent` | `#4F8CFF` | the single brand accent: links, focus rings, primary buttons, active nav |
| `--easy` | `#22C55E` | difficulty Easy |
| `--medium` | `#F5A524` | difficulty Medium |
| `--hard` | `#EF4444` | difficulty Hard |
| status: not started | `#525252` | |
| status: attempted | `#F5A524` | |
| status: solved | `#22C55E` | |
| status: revised | `#38BDF8` | |
| priority P1 / P2 / P3 | green / amber / violet (`#A78BFA`) at about 15% opacity background with full-colour text | |

**Rules:**
- **Type:** Geist Sans for UI and Geist Mono for numbers, LC numbers and timers. Use `tabular-nums` on all numbers. Page titles text-2xl/semibold, section titles text-sm/medium uppercase tracking-wide muted.
- **Surfaces:** `rounded-xl`, 1px border, no heavy shadows, no gradients. One allowed exception: a very subtle radial accent glow behind the dashboard header.
- **Density:** comfortable but information-rich, like Linear or Vercel's dashboard. 8px spacing grid.
- **Charts:** dark grid lines (`#1F1F1F`), muted axis labels, accent colour for "actual", muted grey dashed for "planned", difficulty colours for E/M/H.
- **Layout:**
  - Desktop: a collapsible left sidebar (icons + labels, revision badge) and a sticky top bar with the page title, today's date (IST), a "Day N / 112" pill and the running timer pill.
  - Mobile (<768px): bottom tab bar (Dashboard, Today, Problems, Revision, More) and a sheet menu for the rest. Tables become stacked cards on mobile.
- **States:**
  - Skeleton loaders (`loading.tsx`) on every route.
  - Friendly empty states.
  - `error.tsx` boundaries.
  - `not-found.tsx`.
  - Toasts on every mutation.
- **Accessibility:** visible focus rings in the accent colour, WCAG AA contrast, aria-labels on icon buttons, full keyboard operability, `prefers-reduced-motion` respected.
- **Motion:** subtle 150–200ms transitions only.

---

## 6. Seed data: `data/seed-data.json` (already in the repo)

```ts
{
  meta: {
    version: 1,
    defaultStartDate: "2026-11-05",
    defaultDailyHours: 3,
    planDays: 112,
    timezone: "Asia/Kolkata",
    reviewRule: string,
    mockDayIndexes: number[],          // [24,45,66,87,101,108]
    redoOffsetsDays: [1, 7, 30],
    counts: { topics: 25, problems: 252, easy: 58, medium: 162, hard: 32 },
    notes: string
  },
  topics: Array<{
    id: string,                        // slug, e.g. "arrays-matrix"
    order: number,                     // 1..25 (plan order)
    name: string,
    priority: "P1" | "P2" | "P3",
    phase: string,                     // e.g. "1 Foundations"
    plannedDays: number,
    importance: { tierA: 0|1|2|3, tierB: 0|1|2|3, tierC: 0|1|2|3 },
    dailyFocus: string[]               // one entry per study day of this topic
  }>,
  problems: Array<{
    lcNumber: number,                  // unique across the seed
    order: number,                     // 1..252 plan order
    title: string,
    difficulty: "Easy" | "Medium" | "Hard",
    topicId: string,
    keyIdea: string,
    url: string
  }>,
  schedule: Array<{
    dayIndex: number,                  // 0..111
    type: "study" | "review" | "mock" | "final",
    phase: string,
    topicId: string | null,            // set for study days only
    title: string,
    focus: string,
    problemIds: number[]               // LC numbers (study days only)
  }>,
  companyTiers: Array<{ tier, examples, round, topics, difficulty, volume }>,   // all strings
  companyFavorites: Array<{ company, topics, examples }>,                      // all strings
  sources: Array<{ title, url }>,
  statusMeaning: { "Not started": string, "Attempted": string, "Solved": string, "Revised": string },
  rules: Array<{ title, text }>,
  patternTriggers: Array<{ trigger, pattern }>
}
```

**Where each part lives:**
- Plan data (topics, problems, schedule) goes in the database, so problems can be edited or added and progress can join against it.
- Static reference content (`companyTiers`, `companyFavorites`, `sources`, `statusMeaning`, `rules`, `patternTriggers`, `meta`) is imported directly from the JSON in server code via `src/lib/content.ts`, typed with zod or TS types. It is not stored in the DB.

**Seed script** (`scripts/seed.ts`, run with `tsx`) must be **idempotent and never destroy progress**:
- Upsert topics by `id`.
- Upsert planned problems by `lcNumber`, updating only plan fields (title, url, difficulty, topicId, keyIdea, order) and never the user fields.
- Rebuild `schedule_days` and `schedule_day_problems` from JSON, keeping `day_logs`, which are keyed by `dayIndex`.
- Insert the `settings` singleton only if it is missing (start date 2026-11-05, 3 hours).
- Print counts at the end and assert 25 / 252 / 112.

---

## 7. Database schema (Drizzle, Postgres)

Use pgEnums where listed and add sensible indexes.

```txt
settings            id int pk (always 1), start_date date not null, daily_hours int not null default 3,
                    created_at timestamptz default now(), updated_at timestamptz default now()

topics              id text pk, order int not null, name text not null, priority priority_enum ('P1','P2','P3'),
                    phase text not null, planned_days int not null,
                    importance_a int, importance_b int, importance_c int, daily_focus jsonb (string[])

problems            id serial pk, lc_number int null unique, order int not null, title text not null,
                    url text null, difficulty difficulty_enum ('easy','medium','hard'),
                    topic_id text fk -> topics.id, key_idea text null, is_custom boolean default false,
                    status status_enum ('not_started','attempted','solved','revised') default 'not_started',
                    solved_at date null, how how_enum ('alone','hint','solution') null,
                    time_minutes int null, redo_flag boolean default false,
                    redo1_done_at date null, redo7_done_at date null, redo30_done_at date null,
                    notes text null, created_at timestamptz default now(), updated_at timestamptz default now()
                    indexes: (topic_id), (status), (solved_at)

schedule_days       day_index int pk, type day_type_enum ('study','review','mock','final'), phase text,
                    topic_id text null fk -> topics.id, title text, focus text

schedule_day_problems  day_index int fk -> schedule_days, problem_id int fk -> problems.id,
                       position int, pk (day_index, problem_id)

day_logs            day_index int pk, status day_status_enum ('yes','partial','skipped') null,
                    hours_spent numeric(4,1) null, notes text null, updated_at timestamptz default now()

activity_events     id serial pk, occurred_at timestamptz default now(), event_date date not null (IST),
                    problem_id int fk -> problems.id on delete cascade,
                    type event_type_enum ('status_change','redo_done'),
                    from_status status_enum null, to_status status_enum null, redo_stage int null
                    index: (event_date)

mistakes            id serial pk, date date not null, problem_id int null fk -> problems.id on delete set null,
                    problem_title text null, topic_id text null fk -> topics.id,
                    trigger text, what_went_wrong text, correct_idea text, resolved boolean default false,
                    created_at timestamptz default now(), updated_at timestamptz default now()

mock_tests          id serial pk, date date not null, title text not null, attempted int not null,
                    solved int not null, duration_minutes int null, topic_ids text[] default '{}',
                    what_went_wrong text null, notes text null, created_at timestamptz default now()
```

**Counted events** (for streak and heatmap):
- `status_change` events whose `to_status` is solved or revised.
- `redo_done` events.

**Streak:**
- Count consecutive IST dates with at least one counted event, ending today.
- If today has none yet, count up to yesterday and show "keep it alive today".
- Longest streak over all time.

---

## 8. Architecture

**Reads:**
- Server Components call typed query functions in `src/server/queries/*`.
- Pages are dynamic: they read cookies, so no static caching of user data. Add `export const dynamic = "force-dynamic"` where needed.
- Keep the dashboard to a handful of aggregated SQL queries. Do not issue N+1 queries.

**Writes:**
- Server Actions live in `src/server/actions/*`.
- Every action calls `requireSession()` first. Do not rely on the proxy/middleware alone.
- Inputs are validated with zod.
- Writes use `db.batch` when several statements must succeed together (e.g. problem update + activity event).
- Then `revalidatePath` for the affected routes.
- Return `{ ok: true } | { ok: false, error }`.

**Pure logic:**
- All metric and date math lives in `src/lib/metrics.ts` and `src/lib/dates.ts`, framework-free, with vitest tests.
- Covered: per-topic aggregation, KPIs, pace, ahead/behind, plan curve, cumulative actual, weekly buckets, streaks, redo due-state derivation, day-index/date mapping in IST.

**Client components:**
- Only where interactivity is needed: status controls, filters, dialogs, charts, timer, shortcuts.
- Use `useOptimistic` + `useTransition` for instant status changes, and roll back with a toast on failure.

**IST dates:**
- One helper `todayIST(): string` returns 'YYYY-MM-DD'.
- Store all user dates as `date` (no time).
- Never use server-local `new Date()` for "today". Vercel runs in UTC.

**Env vars** (document them in `.env.example`):
- `DATABASE_URL`
- `APP_PASSWORD`
- `AUTH_SECRET` (at least 32 random characters)

Validate them at startup with zod in `src/lib/env.ts`.

---

## 9. Authentication (single user)

- **Login page:** `/login` has one password field. Its Server Action compares the password against `APP_PASSWORD` using a constant-time comparison.
  - On success it signs a JWT (HS256, `jose`, secret `AUTH_SECRET`, 30-day expiry).
  - It stores the JWT in cookie `dsa_session` (`httpOnly`, `secure` in production, `sameSite=lax`, `path=/`).
  - Then it redirects to the `next` param or `/`.
  - On failure it waits about 800ms before responding and shows an error.
- **Route protection:** `proxy.ts` (Next 16+) or `middleware.ts` (Next 15) redirects unauthenticated requests to `/login?next=…`. It excludes `/login`, static assets, `manifest`, icons and `_next`.
- **Server-side checks:** `requireSession()` (in `src/server/auth.ts`) verifies the JWT in every Server Action and route handler, and in the `(app)` layout.
- **Logout:** clears the cookie.

---

## 10. Folder structure (target)

```txt
.
├── data/
│   └── seed-data.json                 # provided
├── drizzle/                           # generated migrations
├── scripts/
│   └── seed.ts
├── public/                            # static icons if not generated
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx             # app shell: sidebar / bottom nav / topbar / timer pill / shortcuts
│   │   │   ├── page.tsx               # Dashboard
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   ├── today/page.tsx
│   │   │   ├── schedule/page.tsx
│   │   │   ├── problems/page.tsx
│   │   │   ├── topics/page.tsx
│   │   │   ├── topics/[id]/page.tsx
│   │   │   ├── revision/page.tsx
│   │   │   ├── mistakes/page.tsx
│   │   │   ├── mocks/page.tsx
│   │   │   ├── companies/page.tsx
│   │   │   ├── guide/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/export/[format]/route.ts   # json | xlsx | csv
│   │   ├── manifest.ts
│   │   ├── icon.tsx
│   │   ├── apple-icon.tsx
│   │   ├── not-found.tsx
│   │   ├── globals.css
│   │   └── layout.tsx                 # html.dark, fonts, Toaster
│   ├── components/
│   │   ├── ui/                        # shadcn components
│   │   ├── layout/                    # sidebar, bottom-nav, topbar, page-header
│   │   ├── dashboard/                 # kpi-cards, on-track-banner, charts, topic-table, weak-spots
│   │   ├── problems/                  # problem-table, problem-card, status-control, edit-sheet, add-dialog, filters
│   │   ├── schedule/                  # week-section, day-card, day-log-control
│   │   ├── revision/                  # redo-list, attempted-backlog
│   │   ├── mistakes/  mocks/  topics/  companies/
│   │   ├── timer/                     # timer-provider, timer-pill, timer-controls
│   │   └── shared/                    # difficulty-badge, status-badge, priority-badge, progress-ring, empty-state, heatmap
│   ├── db/
│   │   ├── schema.ts
│   │   └── index.ts                   # neon-http drizzle client
│   ├── lib/
│   │   ├── env.ts
│   │   ├── dates.ts                   # IST helpers, dayIndex <-> date
│   │   ├── metrics.ts                 # pure aggregation + streak + plan curve + redo state
│   │   ├── content.ts                 # typed static content from seed JSON
│   │   ├── constants.ts               # labels, colours, enums mapping
│   │   └── utils.ts                   # cn() etc.
│   ├── server/
│   │   ├── auth.ts                    # session sign/verify, requireSession
│   │   ├── queries/                   # dashboard.ts, problems.ts, schedule.ts, topics.ts, revision.ts, mistakes.ts, mocks.ts, settings.ts
│   │   └── actions/                   # auth.ts, problems.ts, schedule.ts, mistakes.ts, mocks.ts, settings.ts, backup.ts
│   ├── hooks/                         # use-shortcuts.ts, use-timer.ts
│   └── proxy.ts (or middleware.ts)
├── tests/                             # vitest: metrics.test.ts, dates.test.ts, seed-shape.test.ts
├── drizzle.config.ts
├── .env.example
└── README.md
```

**package.json scripts:** `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `db:generate`, `db:migrate`, `db:push`, `db:seed` (`tsx scripts/seed.ts`), `db:studio`.

---

## 11. Metric definitions (implement exactly; unit-test each)

**Counting basics:**
- `isDone(p) = p.status in ('solved','revised')`.
- Topic target by difficulty = count of problems in the topic with that difficulty, including custom problems.
- Topic solved by difficulty = the same count with `isDone`.
- Topic % = solved total / target total (0 if the target is 0).
- Remaining = target − solved.
- Topic status: "Not started" when solved = 0, "Completed" when solved ≥ target, otherwise "In progress".
- Topic start/end dates = min/max date over study days with that `topicId`. Study days = count of those days.

**Plan dates and pace:**
- Plan end = startDate + (planDays − 1).
- Days left = max(0, end − todayIST).
- Pace needed = days left > 0 ? round1((target − solved) / days left) : 0.

**Plan curve and actual:**
- Plan curve: for each dayIndex d, planned(d) = cumulative count of problems on study days with dayIndex ≤ d. Use planned (non-custom) problems only.
- Actual curve: for each date ≤ today, the cumulative count of planned problems whose `solvedAt` ≤ that date and that are currently done.
- Ahead/behind: as defined in 4.5, using non-custom problems only.

**Other:**
- Weekly solved: bucket by plan week, `floor((solvedAt − startDate)/7) + 1`, split by difficulty. Solves before the start go to "Pre-plan".
- Redo state: as defined in 4.2.
- Streak: as defined in Section 7.

---

## 12. Implementation order

1. Inspect the project, then install dependencies, init shadcn and set up the theme tokens and fonts.
2. Write `env.ts`, the Drizzle schema and the db client. Generate the migration. Write `seed.ts`. (Use `.env.local`. If no DB URL is available in this environment, still generate migrations and make the code compile.)
3. Build `dates.ts`, `metrics.ts` and `content.ts`, plus the **vitest tests**. Make them pass.
4. Build auth: session helpers, the proxy/middleware and the login page.
5. Build the app shell: sidebar, bottom nav, topbar and page headers.
6. Build queries and actions with optimistic UI.
7. Build the pages in this order: Today → Problems (+ edit sheet, add dialog) → Revision → Dashboard (+ charts, heatmap) → Schedule → Topics → Mistakes → Mocks → Companies → Guide → Settings (+ export/import/reset).
8. Add the timer, keyboard shortcuts and PWA manifest and icons.
9. Polish: loading and empty states, mobile layouts, accessibility pass.
10. Write the README. Then run `lint`, `typecheck`, `test` and `build`, and fix everything until all are clean.

---

## 13. README must include

1. What the app is: a short version of the context in Section 1.
2. Local setup:
   - `npm i`
   - create `.env.local` from `.env.example`
   - `npm run db:migrate`
   - `npm run db:seed`
   - `npm run dev`
3. **Deploy to Vercel, step by step:**
   1. Push to GitHub.
   2. Create a Neon project (or add Neon from the Vercel Marketplace / Storage tab).
   3. Copy the pooled `DATABASE_URL`.
   4. Run migrate + seed once against it from the local machine.
   5. In Vercel, import the repo and set `DATABASE_URL`, `APP_PASSWORD` and `AUTH_SECRET` (generate it with `openssl rand -base64 32`).
   6. Deploy.
   7. Open the site, log in, and check Settings → start date.
4. How to back up: Settings → Export JSON. Recommend weekly.
5. Re-running the seed is safe and never deletes progress.
6. A "Decisions" section.

---

## 14. Quality bar

- TypeScript strict with no `any` except at clearly-typed boundaries. No ESLint errors. No console errors in the browser.
- Every mutation shows a toast and handles failure with rollback.
- Lighthouse-friendly: semantic HTML, labelled inputs, good contrast, fast first load (charts can be client-only, lazily loaded).
- Responsive from 360px to wide desktop. Test the Today and Problems pages at 375px width.
- No secrets in client bundles. Server-only modules import `server-only`.
- Dates are always correct in IST, including right after midnight IST.

---

## 15. Acceptance criteria (verify each before finishing)

1. `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` all pass with zero errors.
2. Seeding produces exactly **25 topics, 252 problems (58 E / 162 M / 32 H) and 112 schedule days**. Re-running the seed changes no user progress.
3. Unauthenticated access to any app route redirects to `/login`. Server Actions reject requests without a valid session.
4. With the default start date 2026-11-05:
   - Day 0 (Thu 5 Nov) is study "Python, Big-O & Basic Logic" with problems 1480, 1295, 1672, 412.
   - dayIndex 3 (Sun 8 Nov) is a review day.
   - dayIndex 24 (Sun 29 Nov) is a mock.
   - The plan ends Wed 24 Feb 2027.
5. Marking a problem Solved on any page updates, without a manual refresh:
   - its topic's E/M/H solved count
   - the Dashboard KPIs
   - the planned-vs-actual chart
   - the heatmap
   - the streak
6. Setting how = Hint auto-stars the problem. With `solvedAt` = D, its redo stages fall due on D+1, D+7 and D+30. "Redo done" sets status Revised and logs an event.
7. Custom problems appear in topic targets and solved counts but not in the plan curve or ahead/behind.
8. Changing the start date in Settings shifts every schedule date, Today and the Dashboard dates accordingly.
9. Export JSON → reset progress → import JSON restores the same progress. XLSX export opens with the sheets listed in 4.11.
10. Mobile (375px): the bottom nav works, and Today and Problems are fully usable with no horizontal scroll.
11. The black theme is consistent across every page. The accent colour is used sparingly. Difficulty and status colours match Section 5.

When everything passes, print a short summary of what was built, any decisions taken, and the exact deploy steps.

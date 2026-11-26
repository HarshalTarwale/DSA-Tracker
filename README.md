# DSA Tracker

A personal, password-protected tracker for one goal: crack a **Tier C (top product) company, 30–50 LPA**, by mastering DSA in Python.

- **Main plan:** 1 Dec 2026 → 1 Apr 2027. **Practice phase:** to 30 Jun 2027.
- **25 topics** in study order, each with a mastery target (Easy / Medium / Hard). Together: **381 problems** (88 E · 232 M · 61 H).
- **Automatic tracking:** connect your LeetCode (and optionally HackerRank) username. Every accepted problem is pulled in with its difficulty and topic. Nothing to type.
- **Study flow per topic:** watch one video → code the video's 1–2 problems yourself → Easy → Medium → Hard, 25–30 minutes alone before any hint.

## Pages

| Page | What it answers |
|---|---|
| **Dashboard** | How much have I solved (E/M/H vs target), am I on pace, which tier am I ready for, what to improve next |
| **Plan** | What to do today (with suggested problems that tick themselves), this week Mon–Sun, the full roadmap |
| **Topics** | Each topic's progress vs its mastery target; how to study it; suggested problems; your solves |
| **Solved** | Every tracked solve, by date; change a topic if it was detected wrong; add a problem from another site |
| **Companies** | Tier A / B / C: package band, must-know topics, how close you are |
| **Settings** | Usernames, sync, plan dates, reset, log out |

## How auto-tracking works

- The app syncs when you open it (at most every 10 minutes), when you click **Synced …** in the top bar, and once a night (Vercel cron).
- **LeetCode** (public GraphQL, no login): reads your last 20 accepted problems plus profile totals. Open the app at least once every ~20 solves so none are missed.
- **HackerRank** (public REST): reads your solved challenges with their track (e.g. Data Structures › Arrays).
- **Topic detection:** problems from the curated plan keep their planned topic; others are classified from tags, most specific technique first (Two Sum → Hashing, Number of Islands → Graphs). Override any of them on the Solved page.
- These platform endpoints are unofficial. If one changes, the app shows the error next to the sync button and keeps working with manual entries.

## Local setup

```bash
npm i
cp .env.example .env.local   # fill in the values
npm run db:migrate
npm run dev
```

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `APP_PASSWORD` | The password you log in with |
| `AUTH_SECRET` | 32+ random characters: `openssl rand -base64 32` |
| `CRON_SECRET` | Optional. Any random string; enables the nightly sync on Vercel |

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `db:generate`, `db:migrate`, `db:push`, `db:studio`.

## Deploy (Vercel)

1. Push to GitHub; import the repo in Vercel.
2. Set `DATABASE_URL`, `APP_PASSWORD`, `AUTH_SECRET` and `CRON_SECRET` in **Settings → Environment Variables** (paste values without quotes).
3. Run `npm run db:migrate` once against the database (with `DATABASE_URL` in `.env.local`).
4. Deploy, log in, and add your LeetCode username in **Settings**.

## Design notes

- The database stores only settings and solves. Topics, targets and the day-by-day plan come from `data/seed-data.json` and `src/lib/` (`targets.ts`, `plan.ts`), so changing the dates in Settings rebuilds the plan instantly.
- Plan rules (`src/lib/plan.ts`): Sundays are review days (weekly contest + re-solve), the last 7 days are revision and timed mocks, every other day is a study day; topics get days in proportion to their weight, and each topic's E→M→H target is spread across its days.
- Tier readiness (`src/lib/progress.ts`): a topic's mastery score weights Easy ×1, Medium ×2, Hard ×3 (capped at the target). Tier A needs 50% of each must-know topic, Tier B 75%, Tier C 100%.
- Package bands and importance scores are judgment-based estimates for Indian fresher roles, not official data.

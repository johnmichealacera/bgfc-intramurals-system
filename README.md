# BGFC Intramurals Tabulation System

A web-based tabulation system for **Bucas Grande Foundation College**'s intramural sports events — built to replace manual, paper-based score tallying with live scoring, automatic overall-standings computation, and a public scoreboard anyone can follow without an account.

> Looking for how to *use* the deployed app day-to-day? See **[USER_GUIDE.md](./USER_GUIDE.md)** for the step-by-step operator manual. This README covers the technical/developer side.

---

## Features

**Season & roster management**
- Seasons scope everything (teams, events, standings); exactly one can be active at a time
- Custom, admin-defined teams per season (name + color), full create/edit/delete
- Admin and Tabulator user accounts with active/inactive toggling

**Events, two ways**
- **Team vs. Team** events (basketball, volleyball, …) — scheduled `Match`es, scored live
- **Placement** events (dance, track and field, …) — final rankings entered directly, no matches
- Full create/edit for events (type is locked after creation, since it determines the scoring workflow)
- Per-event tabulator assignment, so a scorer can only touch matches for events they're assigned to

**Live scoring**
- A dedicated scoreboard control panel with large +1/+2/+3/−1 buttons per team
- Score writes are atomic increments/decrements at the database level — never read-then-write — so rapid taps or two people scoring at once can't corrupt a match's score or drive it negative
- Match lifecycle: `SCHEDULED → LIVE → FINISHED` (or `POSTPONED`), with the winner computed automatically on finish
- The public **Live** page polls for updates every few seconds — no login, no manual refresh

**Results & standings**
- Configurable points-per-placement table (e.g. 1st = 10, 2nd = 7, …) per season
- Finalizing an event snapshots each team's points at that moment, so later edits to the points table never retroactively rewrite history
- Overall standings sum every finalized event's points per team, with deterministic alphabetical tie-breaking and shared rank numbers for ties (no arbitrarily picking a "winner" out of a tie)

**Public site** (no login required)
- Home, Live scores, Overall Standings, and Schedule (with per-event match/results detail)

**Access control**
- Two roles: `ADMIN` (full control) and `TABULATOR` (scoped to assigned events)
- Enforced in two layers: Next.js proxy (`src/proxy.ts`) redirects a `TABULATOR` away from admin-only routes before the page ever renders, and every match-scoring API route re-checks event assignment server-side (`assertEventAccess`) — the UI nav filter is cosmetic, not the security boundary

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling / UI | Tailwind CSS v4 + shadcn/ui (Base UI primitives) |
| Database | PostgreSQL |
| ORM | Prisma 7 (driver adapter: `@prisma/adapter-pg`) |
| Auth | NextAuth v4 — Credentials provider, JWT sessions |
| Data fetching | SWR (public read-only pages) · TanStack Query (dashboard reads + mutations) |
| Forms | React Hook Form + Zod |
| Icons / Toasts | Lucide React · Sonner |
| Passwords | bcryptjs (cost factor 12) |

---

## Domain Model

```
Season ──┬── Team ──┬── (home/away/winner of) Match
         │           └── EventPlacement
         ├── SportEvent ──┬── Match            (only for type = TEAM_VS_TEAM)
         │                ├── EventPlacement   (final results, either event type)
         │                └── EventTabulator ── User (role = TABULATOR)
         └── PlacementPointsRule  (placement → points, per season)

User (ADMIN | TABULATOR)
```

- **`SportEvent.type`** is either `TEAM_VS_TEAM` (produces `Match` rows) or `PLACEMENT` (ranking only).
- **`EventPlacement.points`** is snapshotted from `PlacementPointsRule` at finalization time — it is not recomputed if the rule table changes later.
- Only one `Season.isActive = true` at a time, enforced by a partial unique index plus a transactional activation endpoint.

Full schema: [`prisma/schema.prisma`](./prisma/schema.prisma).

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/sign-in/          # Public sign-in page
│   ├── (dashboard)/             # Authenticated shell (role-filtered sidebar)
│   │   ├── dashboard/           # Role-aware overview with stat cards
│   │   ├── seasons/  teams/  events/  matches/  points-rules/  users/   # ADMIN only
│   │   ├── events/[id]/         # Event detail — tabulators, matches, finalize
│   │   └── scoreboard/[matchId]/ # Live scoring control panel (ADMIN + TABULATOR)
│   ├── (public)/                # No-login pages: home, live, standings, schedule
│   └── api/
│       ├── seasons|teams|events|matches|users|points-rules/   # Admin CRUD (thin handlers)
│       ├── matches/[id]/score & /status/   # Atomic live-scoring endpoints
│       ├── events/[id]/finalize/           # Transactional results finalization
│       ├── tabulator/my-events/            # Tabulator's assigned-events feed
│       └── public/                          # Unauthenticated read endpoints
├── components/
│   ├── dashboard/                # Sidebar, mobile nav, page header, confirm-delete, schedule-match dialog
│   ├── providers/                 # Session, TanStack Query providers
│   └── ui/                        # shadcn-generated primitives (do not hand-edit)
├── lib/
│   ├── auth.ts                   # NextAuth config, assertRole(), assertEventAccess()
│   ├── db.ts                     # Prisma client singleton (driver adapter)
│   ├── api-client.ts / api-utils.ts   # Typed fetch wrapper + API error mapping
│   ├── nav.ts                    # Role→route nav config, shared with the proxy
│   └── types.ts / format.ts      # Shared frontend types & date/time formatting
├── proxy.ts                       # Server-side route-role enforcement (Next.js Proxy)
└── generated/prisma/              # Generated Prisma Client (gitignored)
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- A PostgreSQL database (local or hosted)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in the values:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/bgfc_intramurals"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate with: openssl rand -base64 32"
```

### 3. Set up the database
```bash
npm run db:migrate   # applies prisma/migrations, including the hand-added
                      # constraints noted at the top of the init migration
npm run db:seed       # seeds a default admin, tabulator, active season, and points rules
```

### 4. Run the dev server
```bash
npm run dev
```
Visit `http://localhost:3000`. Sign in at `/sign-in` with the seeded accounts below, or browse the public pages with no login.

### Seeded accounts
| Role | Email | Password |
|---|---|---|
| Admin | `admin@bgfc.edu.ph` | `password123` |
| Tabulator | `tabulator@bgfc.edu.ph` | `password123` |

> Change these before any real deployment — there is no self-service password reset; an admin resets a password from the **Users** page.

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Start the production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma Client |
| `npm run db:push` | Push schema changes without a migration (prototyping only) |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Run `prisma/seed.ts` |
| `npm run db:reset` | **Destructive** — drops and recreates the database, then reseeds |

---

## Notes for Contributors

- This project targets a newer Next.js/shadcn toolchain than most training data has seen. shadcn's current CLI generates **Base UI**-backed components, not Radix — there is no `asChild` prop; use the `render` prop instead (`<DialogTrigger render={<Button />}>...</DialogTrigger>`), and `Select`'s `onValueChange` can receive `null`. See the generated files in `src/components/ui/` for the real API before assuming Radix conventions.
- Prisma 7 requires an explicit driver adapter (`@prisma/adapter-pg`) — `src/lib/db.ts` and `prisma/seed.ts` both construct one from `DATABASE_URL`.
- API routes are intentionally thin: `assertRole`/`assertEventAccess` → Zod parse → Prisma call → JSON, with error mapping centralized in `src/lib/api-utils.ts`.
- "Real-time" scoring and standings are SWR/TanStack Query polling (3–15s depending on the page), not WebSockets — a deliberate simplification for this project's scope.

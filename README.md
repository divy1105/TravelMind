# TravelMind

AI-assisted multi-city trip planner. Build trips across several destinations, generate a draft itinerary with Google Gemini, refine activities with drag-and-drop, track budget lines, and manage lodging — with email/password auth and a React Three Fiber globe on the home experience.

This repo is a personal → production-oriented monorepo: Vite React client + Express TypeScript API + Drizzle on Neon Postgres.

---

## Features (MVP)

| Module | What you get |
| --- | --- |
| **Auth & profile** | Better Auth email/password; session cookies; editable profile (bio, travel style, currency, home city) |
| **3D immersion** | Interactive R3F globe on the home page; city markers, selection, WebGL fallback |
| **Trip creation** | Multi-stop trips with dates, budget, currency, interests, and city order |
| **AI planner** | Server-side Gemini generation of per-stop activities (and hotel / budget hints); stored as `AiGeneration` |
| **Itinerary DnD** | Per-stop activity list with `@dnd-kit` reorder; manual add / edit / delete |
| **Budget** | Category budget lines (lodging, food, transport, activities, other); rollups vs trip total |
| **Hotels** | Per-stop lodging records; nightly rate × nights; push lodging into the trip budget |

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Client | React 18, Vite 5, TypeScript, Tailwind CSS, React Router |
| Auth (client) | `better-auth` React client (cookie sessions) |
| 3D | Three.js, `@react-three/fiber`, `@react-three/drei` |
| DnD | `@dnd-kit/core`, `@dnd-kit/sortable` |
| API | Express 4, TypeScript (`tsx` in dev) |
| Auth (API) | Better Auth (`/api/auth/*`) |
| ORM / DB | Drizzle ORM, PostgreSQL (Neon) |
| AI | `@google/genai` (Gemini; key stays on the server) |

Not used: Next.js, Supabase, Clerk, Prisma, Firebase Auth.

---

## Monorepo structure

```
TravelMind/
├── Client/                 # Vite + React frontend (package: travelmind-frontend)
│   ├── src/
│   │   ├── pages/          # Routes / screens
│   │   ├── components/     # Immersive globe, nav, auth, theme
│   │   ├── lib/            # Auth client, trips API client
│   │   └── hooks/
│   ├── .env.example
│   └── package.json
├── src/
│   └── api/                # Express API (package: travelmind-backend)
│       ├── drizzle/        # SQL migrations
│       ├── drizzle.config.ts
│       ├── src/
│       │   ├── db/         # Drizzle schema + client
│       │   ├── routes/     # health, users, trips
│       │   ├── services/   # Gemini trip planner
│       │   ├── middleware/
│       │   ├── auth.ts     # Better Auth instance
│       │   └── index.ts
│       ├── .env.example
│       └── package.json
├── package.json            # Root workspace declaration
├── plan.md
└── README.md
```

**Workspace note:** The root `package.json` currently lists workspaces as `frontend` and `backend/api`. On disk the packages live at `Client/` and `src/api/`. Until those paths are aligned, install and run scripts from each package directory (steps below), not via `npm -w …` from the root.

---

## Prerequisites

- **Node.js** 18+ (developed against Node 22 / npm 11 is fine)
- **Neon** (or any Postgres) account and a connection string
- **Google AI / Gemini** API key (used only by the API)

No Clerk, Mapbox, or Firebase keys required.

---

## Setup / install

1. Clone the repo and open the project root.

2. **API dependencies**

   ```bash
   cd src/api
   npm install
   cp .env.example .env
   # edit .env — set DATABASE_URL and GEMINI_API_KEY
   npm run db:migrate
   # or: npm run db:push   (prototype / empty DB)
   ```

3. **Client dependencies**

   ```bash
   cd Client
   npm install
   cp .env.example .env
   # edit .env if API is not on http://localhost:3001
   ```

---

## Environment variables

Copy from the checked-in examples only. Never commit real secrets (`.env` is gitignored).

### Client — `Client/.env.example`

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API origin (default: `http://localhost:3001`) |

### API — `src/api/.env.example`

| Variable | Purpose | Required? |
| --- | --- | --- |
| `DATABASE_URL` | Neon/Postgres URL (`?sslmode=require` typical for Neon) | Yes |
| `GEMINI_API_KEY` | Google Gemini API key (**server-side only**) | Yes (for AI planner) |
| `GEMINI_MODEL` | Model id (example: `gemini-2.0-flash`) | Optional |
| `PORT` | API listen port (default `3001`) | Optional |
| `CLIENT_ORIGIN` | CORS + trusted origin (default `http://localhost:3000`) | Optional |
| `BETTER_AUTH_SECRET` | Session signing secret | Optional — auto-written to gitignored `.auth-secret` if unset |
| `BETTER_AUTH_URL` | Public API URL for Better Auth (default `http://localhost:$PORT`) | Optional |

The Gemini key must not appear in the Vite client or any `VITE_*` variable.

---

## Database (Drizzle)

Schema lives in `src/api/src/db/schema.ts`. Migrations under `src/api/drizzle/`.

| Table | Role |
| --- | --- |
| `user` / `session` / `account` / `verification` | Better Auth |
| `profile` | Bio, travel style, preferred currency, home city |
| `trip` | Multi-city trip (dates, budget, interests, status) |
| `stop` | Ordered city stop on a trip |
| `activity` | Ordered activities within a stop |
| `hotel` | Lodging linked to a stop |
| `budget_line` | Trip budget entries; optional link to an activity |
| `ai_generation` | Stored prompt + raw JSON from Gemini |

From `src/api`:

```bash
# Apply migrations (recommended)
npm run db:migrate

# Or push schema without migration files (dev/prototype)
npm run db:push

# Generate a new migration after schema edits
npm run db:generate
```

**Note:** Migrating from the old Prisma + Clerk schema is not automatic. Prefer a fresh Neon database (or drop old tables) then migrate/push. Existing Clerk users must sign up again.

---

## Running locally

Use two terminals.

**API** (default `http://localhost:3001`):

```bash
cd src/api
npm run dev
```

**Client** (Vite on port `3000` per `Client/vite.config.ts`):

```bash
cd Client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Ensure `VITE_API_BASE_URL` points at the API.

Quick checks:

- `GET http://localhost:3001/ping` → `{ "ok": true }`
- `GET http://localhost:3001/health` → `{ "ok": true }` when the DB is reachable

---

## Main app routes / how to use

| Path | Access | Description |
| --- | --- | --- |
| `/` | Public | Home + immersive 3D globe; CTA into the planner |
| `/sign-in` | Public | Email/password sign-in |
| `/sign-up` | Public | Email/password sign-up |
| `/planner` | Auth | Create / list trips; multi-city stops; **Generate with AI** |
| `/planner/:tripId/itinerary` | Auth | Per-stop activities; drag-and-drop reorder |
| `/planner/:tripId/budget` | Auth | Budget lines and totals vs trip budget |
| `/planner/:tripId/hotels` | Auth | Hotels per stop; add lodging cost to budget |
| `/profile` | Auth | View / update profile fields |
| `*` | — | Redirects to `/` |

Typical flow:

1. Sign up / sign in (Better Auth sets an HTTP-only session cookie).
2. Open **Planner**, create a trip with cities, dates, budget, and interests.
3. Run **Generate with AI** (API calls Gemini; activities land on stops).
4. Polish the itinerary on the itinerary page (DnD + edits).
5. Add hotels and budget lines; optionally push hotel lodging into the budget.
6. Keep profile preferences in sync for currency / travel style.

---

## API overview

Base URL: `http://localhost:3001` (or your deployed API). Protected routes use Better Auth **session cookies** (`credentials: 'include'`). CORS allows `CLIENT_ORIGIN` with credentials.

### Health

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/ping` | Liveness (no DB) |
| `GET` | `/health` | DB ping via Drizzle |

### Auth & users

| Method | Path | Notes |
| --- | --- | --- |
| `*` | `/api/auth/*` | Better Auth handler (sign-up, sign-in, session, sign-out) |
| `GET` | `/api/users/me` | Current user + profile |
| `PATCH` | `/api/users/me` | Update name / profile fields |

### Trips / stops / activities / budget / hotels

Same REST surface as before (`/api/trips…`) — see prior MVP docs. Owner checks use the Better Auth user id (`trip.userId`).

---

## Scripts reference

### `src/api` (`travelmind-backend`)

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `tsx watch src/index.ts` | API with reload |
| `build` | `tsc -p tsconfig.json` | Compile to `dist/` |
| `start` | `node dist/index.js` | Run compiled API |
| `db:generate` | `drizzle-kit generate` | Create SQL migration from schema |
| `db:migrate` | `drizzle-kit migrate` | Apply migrations |
| `db:push` | `drizzle-kit push` | Push schema (no migration file) |
| `db:studio` | `drizzle-kit studio` | Drizzle Studio |

### `Client` (`travelmind-frontend`)

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite` | Dev server (port 3000) |
| `build` | `vite build` | Production client build |
| `preview` | `vite preview` | Preview production build |

---

## Notes

- Persistence is **Drizzle + Neon (Postgres)**; auth is **Better Auth** (email/password only).
- **Gemini runs only on the API.** Keep `GEMINI_API_KEY` in `src/api/.env`.
- Better Auth secret is local (env or `.auth-secret`) — not a third-party dashboard key.
- Root npm workspaces still point at `frontend` / `backend/api`; use `Client/` and `src/api/` until the root config is updated.
- Do not commit `.env` files, `.auth-secret`, or real API keys.

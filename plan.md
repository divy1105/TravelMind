# TravelMind — Complete Project Plan

> Living roadmap for TravelMind: AI-powered multi-city trip planning, from MVP (done) through premium UI polish and growth features.  
> Last updated: 2026-07-29

---

## 1. Vision

**Product:** TravelMind — an AI travel assistant that makes it easy to plan a full multi-city trip with activities, hotels, and budgets in one place.

**Tone:** Friendly, smart, guiding.

**Lifecycle support (long-term):** idea → planning → preparation → travel → reflection.

**Environment:** Personal build now, shaped for production later (auth, Neon Postgres, server-side AI keys, modular features).

**3D intent:** Immersive landing / trip globe / cinematic transitions — not a full 3D app shell. Planner screens stay mostly 2D for usability.

---

## 2. Decisions locked

| Decision | Choice |
| --- | --- |
| Name | TravelMind |
| Frontend | React + Vite + TypeScript + Tailwind |
| Backend | Node.js + Express (TypeScript) |
| Database host | Neon Postgres |
| ORM | **Drizzle ORM** (replaces Prisma) |
| Auth | **Better Auth** — email/password only (replaces Clerk) |
| AI | Google Gemini (server-side only) |
| 3D | React Three Fiber + drei |
| DnD | @dnd-kit |
| Deploy target (later) | Netlify (Client) + Railway/Render (API) |
| Repo layout | `Client/` + `src/api/` |
| Workflow | Build module → review → **git commit per module** |
| Avoided stack | Next.js, Supabase, Clerk, Prisma, Firebase Auth |
| **Vendor credentials allowed** | **Neon `DATABASE_URL` + `GEMINI_API_KEY` only** |

### 2.1 Env policy — only Neon + Gemini from the outside

You should never need Clerk, Firebase, Auth0, Mapbox, or other dashboard API keys for core auth/ORM/AI.

| Variable | Source | Required? |
| --- | --- | --- |
| `DATABASE_URL` | **Neon** dashboard | Yes — Postgres |
| `GEMINI_API_KEY` | **Google AI Studio** | Yes — AI planner only |
| `BETTER_AUTH_SECRET` | **Not a vendor key** | Generated locally once (see below) — never from Clerk/Google auth products |
| `PORT` / `CLIENT_ORIGIN` | Optional local config | Defaults in code (`3001`, `http://localhost:3000`) |
| `VITE_API_BASE_URL` | Local | Default `http://localhost:3001` — not a secret |

**Removed forever (auth):** `CLERK_*`, `VITE_CLERK_*`, Firebase config, OAuth client IDs.

**Better Auth secret (so you don’t “put another API key”):**  
On first API boot, if `BETTER_AUTH_SECRET` is missing, the server generates a random secret and writes it to a **gitignored** file (e.g. `src/api/.auth-secret`). You do not copy anything from a website. Optional: set `BETTER_AUTH_SECRET` in `.env` yourself later for production deploy.

**Client auth:** no publishable keys — email/password forms talk to your Express Better Auth routes only.

### 2.2 Stack migration sprint (before UI polish)

1. Drizzle schema = current Prisma models; migrate off Prisma.  
2. Better Auth email/password on Express; session cookies; auto local secret file.  
3. Replace all Clerk Client/API usage.  
4. `.env.example` lists only: `DATABASE_URL`, `GEMINI_API_KEY`, optional `PORT` / `CLIENT_ORIGIN` / `VITE_API_BASE_URL`.  
5. Update README + this plan. Remove `@clerk/*` and Prisma when stable.  

Then Sprint 1 (design system).

---

## 3. Monorepo structure

```
TravelMind/
├── Client/                 # Vite + React frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── styles/
│   └── .env.example
├── src/
│   └── api/                # Express + Drizzle API (migrating from Prisma)
│       ├── drizzle/            # SQL migrations
│       ├── src/
│       │   ├── db/             # Drizzle schema + client
│       │   ├── routes/
│       │   ├── services/
│       │   ├── middleware/
│       │   └── auth.ts         # Better Auth
│       └── .env.example
├── README.md
├── plan.md                 # This file
└── package.json
```

**Workspaces:** Root `package.json` lists `Client` and `src/api`. You can still run install/dev from each package folder.

---

## 4. Data model (current)

```
User 1──1 Profile
User 1──* Trip
Trip 1──* Stop
Stop 1──* Activity
Stop 1──* Hotel
Trip 1──* BudgetLine (optional link → Activity)
Trip 1──* AiGeneration
```

| Model | Purpose |
| --- | --- |
| User / Profile | Better Auth user + profile prefs (travel style, currency, home city) |
| Trip | Multi-city trip shell (dates, budget, interests, status) |
| Stop | Ordered cities on a trip |
| Activity | Day activities (AI-generated or manual) |
| AiGeneration | Log of Gemini prompts/responses |
| BudgetLine | Category spend vs `Trip.totalBudget` |
| Hotel | Per-stop lodging; can push to lodging budget |

---

## 5. MVP module roadmap — status

Build order agreed and executed:

| # | Module | Status | Commit (local) |
| --- | --- | --- | --- |
| 1 | Foundation / App Shell | Done | Initial scaffold |
| 2 | Auth & Profiles (Better Auth + Drizzle) | Done (Sprint 0 migration) | — |
| 3 | 3D Immersion Layer | Done | `7ff1be4` |
| 4 | Trip Creation | Done | `fff3814` |
| 5 | AI Trip Planner (Gemini) | Done | `b278fee` |
| 6 | Itinerary Builder (DnD) | Done | `1824fc0` |
| 7 | Budget Manager | Done | `86be7e4` |
| 8 | Hotels (light) | Done | `1053fd8` |

### MVP feature summary

- Better Auth email/password sign-in / profile edit
- Interactive R3F globe on Home (5 featured cities, WebGL fallback, cinematic Home→Planner transition)
- Create/list/update trips and stops
- `POST /api/trips/:id/generate` → Gemini draft activities
- Drag-and-drop itinerary at `/planner/:tripId/itinerary`
- Budget lines + category totals at `/planner/:tripId/budget`
- Hotels + add-to-budget at `/planner/:tripId/hotels`

### Env required (target after Better Auth + Drizzle migration)

**Vendor keys only:**
- `DATABASE_URL` — Neon  
- `GEMINI_API_KEY` — Gemini  

**Local / optional (not vendor dashboards):** `PORT`, `CLIENT_ORIGIN`, `VITE_API_BASE_URL`, auto-generated `.auth-secret`  

**Migration complete:** Clerk and Prisma are removed; Better Auth + Drizzle are the live stack.

---

## 6. Honest assessment (post-MVP)

**Strong:** Real auth, Postgres schema, AI generation, DnD itinerary, budget, hotels.  
**Weak for a “top travel site”:** Visual design still CRUD/admin-like — no custom fonts/brand tokens, untextured globe, no maps/photos, no toasts/skeletons/icons, homepage still has “Module 3” scaffold copy, theme toggle has no UI.

**Strategy:** Do **not** pile on more CRUD first. Productize brand + UI, then add signature features (maps, imagery, share).

---

## 7. Visual direction (locked for polish)

**Travel-editorial** look — avoid purple gradients, cream+terracotta AI clichés, and dense newspaper layouts.

| Token | Direction |
| --- | --- |
| Palette | Deep ocean teal `#0B3D4A`, sand `#E8D5B5`, off-white surfaces, ink text |
| Type | Display (Fraunces or Playfair, sparingly) + body (DM Sans or Source Sans 3) |
| Imagery | Full-bleed destinations on marketing; thumbnails on trip cards |
| Motion | 2–3 intentional motions (Framer Motion): page enter, list stagger, globe camera |
| Brand | SVG compass + “TravelMind” as **hero-level** signal on landing (not nav-only) |

**Landing first viewport rules:** brand, one headline, one supporting sentence, one CTA group, one dominant visual. No stats strips or card clutter in the hero.

---

## 8. Premium polish roadmap (next)

### Phase A — Design system & app shell (Sprint 1) — done

- Expand CSS variables + Tailwind theme (brand, accent, muted, danger, radius, shadow)
- Fonts, favicon, logo SVG
- Rebuild TopNav: logo, primary CTA, mobile drawer, **theme toggle UI**
- Footer in AppLayout
- UI primitives: Button, Input, Select, Badge, EmptyState, Skeleton, Toast
- `lucide-react` icons
- Remove “Module 3 · 3D Immersion” eyebrow
- Detailed `README.md`

### Phase B — Landing & globe (Sprint 2)

- Brand-first full-bleed hero
- Sections: How it works → Features → Destination mosaic → Final CTA
- Globe: Earth texture, atmosphere glow, arcs between cities; keep WebGL fallback
- Framer Motion page/section motion

### Phase C — Product UI (Sprint 3)

```text
Landing → Trip gallery (cards) → Trip overview hub
                ├─ Itinerary board
                ├─ Budget charts
                └─ Hotels gallery
```

- Trip cards with cover image (e.g. Unsplash by first city), status, dates, budget remaining
- Split oversized Planner into trip overview + focused tools
- Itinerary: stronger columns, larger drag handles, modal/drawer for add activity
- Budget: donut/category chart (`recharts`)
- Hotels: photo placeholders, stronger “Add to budget”
- Global toasts + skeletons + consistent page headers

### Phase D — Interactive 3D colorful map (priority feature)

**Goal:** User drops a pin on a vivid 3D map → popup shows the place → list of activities / POIs around that area → can add them to the trip.

**Stack (no new vendor API keys — keeps Neon + Gemini only):**

| Piece | Choice | Why |
| --- | --- | --- |
| Map engine | **MapLibre GL JS** (+ `react-map-gl` or similar) | Colorful vector/raster styles, pitch/bearing (3D tilt), no Mapbox token |
| Tiles | OpenFreeMap / free MapLibre style URL | No API key |
| Geocode / reverse geocode | **Nominatim (OSM)** via our Express proxy | Pin → place name; rate-limit server-side |
| Nearby places | **Overpass API (OSM)** via Express proxy | Cafes, sights, museums, etc. around lat/lng |
| Enrichment (optional) | **Gemini** (existing key) | Turn POIs into trip-ready activity suggestions |
| Hero globe | Keep/enhance R3F globe on landing; map is the **planner** tool |

**Not used:** Mapbox (would need another token) — conflicts with “Neon + Gemini only.”

#### UX flow

```text
Open /planner/:tripId/map
  → Colorful 3D-tilted map (pitch ~45–60°)
  → Click / long-press → drop pin
  → Popup: place name, address, coords
  → Side panel: "Activities around here" (POIs + optional Gemini polish)
  → User taps Add → creates Activity (and/or Stop) on the trip
```

#### Data / API additions

| Piece | Detail |
| --- | --- |
| Schema | `Stop.lat`, `Stop.lng` (optional); optional `MapPin` or store pin on Activity |
| `GET /api/geo/reverse?lat=&lng=` | Nominatim proxy → place label |
| `GET /api/geo/nearby?lat=&lng=&radius=` | Overpass proxy → POI list |
| `POST /api/trips/:id/pins` or reuse stops | Save pin + link activities |
| `POST /api/trips/:id/nearby/suggest` | Optional Gemini: POIs → activity drafts |

#### Client route

| Path | Purpose |
| --- | --- |
| `/planner/:tripId/map` | Interactive 3D map explorer |

Show trip stops as existing pins; route line between stops when ≥2 have coords.

---

### Phase E — Packing + weather, Journal + photos, Currency (in scope)

These three are **confirmed in scope**. Still **no new vendor API keys**.

#### 1. Packing checklist + weather

| Piece | Approach |
| --- | --- |
| Model | `PackingItem` — tripId, label, category, packed (bool), qty? |
| Weather | **Open-Meteo** (free, **no API key**) via Express proxy — forecast for stop lat/lng |
| AI | Optional Gemini: generate packing list from trip type + weather summary |
| UI | `/planner/:tripId/packing` — checklist, weather strip per stop, check-off |

#### 2. Journal + photos

| Piece | Approach |
| --- | --- |
| Model | `JournalEntry` — tripId, stopId?, title, body, createdAt |
| Photos | `JournalPhoto` — entryId, filePath, caption? |
| Storage | API `uploads/` folder (gitignored); paths in Neon — no paid CDN in this phase |
| UI | `/planner/:tripId/journal` — timeline, image upload, gallery |

#### 3. Currency converter

| Piece | Approach |
| --- | --- |
| Rates | **Frankfurter.app** (free, **no API key**) via Express proxy |
| UX | Widget on Budget page; convert using `Trip.currency` ↔ `Profile.preferredCurrency` |
| Cache | Server cache rates (~12h) |

---

### Phase F — Later leaps (after E)

1. Destination imagery on trip cards  
2. Public share link  
3. PDF / printable itinerary  
4. Collaboration / community  

**Explicitly defer:** full OTA booking; Mapbox token unless you allow a third vendor key.

---

## 9. Modules schedule

| Module | When |
| --- | --- |
| **Interactive 3D map (pin + nearby)** | **Sprint 4** |
| **Packing + weather** | **Sprint 5** |
| **Currency converter** | **Sprint 5** (with Budget) |
| **Journal + photos** | **Sprint 6** |
| Collaboration (Socket.io) | After share link |
| Community (clone / votes) | Growth |
| Marketplace / templates | Growth |

---

## 10. Suggested sprint board

| Sprint | Focus | Done when |
| --- | --- | --- |
| 0 | Better Auth + Drizzle; Neon + Gemini only | Clerk/Prisma gone |
| 1 | Design system / shell | App looks branded |
| 2 | Landing + textured globe | Impressive first impression |
| 3 | Trip cards / hub / charts | Planner feels like a product |
| 4 | MapLibre 3D pin + nearby activities | Map wow |
| 5 | **Packing + Open-Meteo weather + currency converter** | Prep + money tools |
| 6 | **Journal + photo uploads** | Reflection layer |
| 7+ | Share, PDF, collab/community | Growth |

---

## 11. Engineering conventions

1. **One module / sprint slice → review → commit** (user-triggered commits).  
2. **Never commit `.env` or secrets.** Use `.env.example` only.  
3. **Vendor keys only:** `DATABASE_URL` (Neon) + `GEMINI_API_KEY`. Proxy Open-Meteo, Frankfurter, Nominatim, Overpass (rate limits + User-Agent).  
4. **Schema per module:** propose → approve → migrate → implement.  
5. **Owner checks:** Better Auth session → User → ownership.  
6. Prefer shared Client helpers over one-off `fetch`.  
7. **Uploads:** gitignore `uploads/`; never commit user photos.

---

## 12. API surface (current + planned)

| Area | Endpoints (representative) |
| --- | --- |
| Health | `GET /health` |
| Auth / users | Better Auth routes; profile `GET|PATCH /api/users/me` |
| Trips / stops | CRUD under `/api/trips`, stop reorder |
| AI | `POST /api/trips/:id/generate` |
| Activities | create / patch / delete / reorder |
| Budget | `GET .../budget`, budget-line CRUD |
| Hotels | hotel CRUD, `.../add-to-budget` |
| Geo / map *(Sprint 4)* | `GET /api/geo/reverse`, `GET /api/geo/nearby`, pins |
| Weather *(Sprint 5)* | `GET /api/weather?lat=&lng=` |
| Packing *(Sprint 5)* | packing-item CRUD; optional generate |
| FX *(Sprint 5)* | `GET /api/fx?from=&to=&amount=` |
| Journal *(Sprint 6)* | journal CRUD; photo upload |

See `README.md` for full route list and run instructions.

---

## 13. Client routes

| Path | Purpose |
| --- | --- |
| `/` | Home + globe |
| `/sign-in`, `/sign-up` | Better Auth email/password (after migration) |
| `/profile` | Profile (protected) |
| `/planner` | Trip list / create (protected) |
| `/planner/:tripId/itinerary` | DnD itinerary |
| `/planner/:tripId/budget` | Budget (+ currency converter) |
| `/planner/:tripId/hotels` | Hotels |
| `/planner/:tripId/map` | 3D map: pin + nearby *(Sprint 4)* |
| `/planner/:tripId/packing` | Packing + weather *(Sprint 5)* |
| `/planner/:tripId/journal` | Journal + photos *(Sprint 6)* |

---

## 14. What not to do (yet)

- Mapbox / Google Maps keys (breaks Neon+Gemini-only policy)  
- Paid weather/FX SaaS when Open-Meteo + Frankfurter work free  
- Full community / marketplace / realtime before share + map  
- Dark-only or purple-glow aesthetic  
- Cluttered hero with stats and promo chips  
- Booking.com-scale inventory integrations as the next step  

---

## 15. Immediate next action

Sprints **0–1 done**. Next in order:

1. **Sprint 2 — Landing + textured globe**  
2. **Sprint 3 — Trip cards / hub / charts**  
3. **Sprint 4 — MapLibre 3D pin map + nearby activities**  
4. **Sprint 5 — Packing + weather + currency converter**  
5. **Sprint 6 — Journal + photos**  

Say **“execute Sprint 2”** (or the next sprint number) to continue.

---

## 16. Success criteria (top-level travel site)

TravelMind feels production-grade when:

- [ ] Only vendor keys needed: Neon + Gemini  
- [ ] Better Auth + Drizzle (no Clerk/Prisma)  
- [ ] Brand is unmistakable on the first viewport  
- [ ] Landing converts curiosity → sign-in / create trip  
- [ ] Planner looks like a travel workspace, not an admin form  
- [ ] **3D colorful map: drop pin → place popup → nearby activities → add to trip**  
- [ ] **Packing list driven by weather**  
- [ ] **Currency converter on budget**  
- [ ] **Journal with photos**  
- [ ] AI generate is one obvious, delightful action  
- [ ] Budget and hotels feel visual and trustworthy  
- [ ] Mobile nav and touch targets work  
- [ ] README + this plan stay accurate as features ship

# Architecture

GitPulse Insights is a **Next.js 16 App Router** application (Turbopack build) that
fetches a GitHub profile, deep-scans its repositories, and produces an insights
dashboard plus per-repo **CURISM©** scores. All GitHub traffic is proxied through
server-side API routes to avoid browser CORS and to keep the pipeline (API → HTML
fallback) in one place.

## System overview

```mermaid
flowchart LR
    subgraph Client
        P[app/page.tsx]
        J[app/jobs/page.tsx]
        H[components/Header.tsx]
        C[components/CurismPanel.tsx]
    end

    subgraph Server (Next.js Route Handlers)
        S[GET /api/scan]
        R[GET /api/scan/progress]
    end

    subgraph GitHub
        API[REST API api.github.com]
        RAW[raw.githubusercontent.com]
        WEB[github.com HTML]
        ZIP[codeload.github.com zips]
    end

    P --> S
    P --> R
    S -->|primary| API
    S -.->|403 / quota exhausted| WEB
    S -.->|repo pages| WEB
    S -.->|source archives| ZIP
    S -.->|readme files| RAW
    C --> P
    J --> H
```

## Request lifecycle (`GET /api/scan`)

1. **Client** (`app/page.tsx`) posts the username; the route handler runs the scan
   and the client polls `/api/scan/progress` (~900ms) for live progress.
2. **Route** (`app/api/scan/route.ts`) calls `runApiScan(user, limit)`:
   - `fetchUser` / `fetchRepos` from the GitHub REST API (`lib/github-server.ts`).
   - `selectRepos(repos, limit)` picks the highest-influence repos (stars/forks/log-size).
   - Each selected repo is scored via `scanRepo` (API tree + raw README) or, when the
     API quota is burned, via `scanHtml` (HTML scraping + local zip analysis).
3. **Caching** (`lib/scan-store.ts`) stores the last result per user with a TTL;
   repeat scans are served from cache (`mode`, profile, tip, timestamps).
4. **Response** `{ mode: "api" | "html", profile: ProfileCurism, userData, reposData, tip }`.

### Rate-limit fallback (`mode: "html"`)

If the REST phase throws `RateLimitError`, the route falls through to
`scanHtml(login, limit)` (`lib/github-html.ts`), which:

- scrapes the profile page and repo listing via GitHub public HTML,
- fetches per-repo metadata pages,
- downloads each repo's source zip from `codeload.github.com` (cap ~150 MB),
- analyzes the zip locally with `adm-zip` — trees, README depth, tests, CI
  workflows, lockfiles, secrets, language mix,
- reports oversized zips as **metadata-only** (counted in `tip`).

Both paths return the same `ScanResult` shape, so the UI is agnostic.

## Module map

| Module | Responsibility |
| ------ | -------------- |
| `app/api/scan/route.ts` | Orchestrates `runApiScan` + HTML fallback; `?limit`, `?mode` |
| `app/api/scan/progress/route.ts` | Serves in-flight scan progress |
| `lib/github-server.ts` | REST API client (`API`, `RAW`), `fetchUser`, `fetchRepos`, `scanRepo`, `RateLimitError` |
| `lib/github-html.ts` | HTML/codeload fallback: `parseProfile`, `parseRepositories`, `parseRepoPage`, `analyzeZip`, `scanHtml` |
| `lib/tree-classify.ts` | Shared path classification: `classifyPaths`, `languagesFromPaths`, regexes for README/license/CI/tests/secrets |
| `lib/curism.ts` | Scoring engine: `scoreRepo`, `aggregateProfile`, `gradeColor`, `CURISM_ORDER`; evidence output |
| `lib/scan-store.ts` | In-memory per-user scan cache + progress state |
| `lib/jobs.ts` | Job-tracker data model, statuses, stats, CSV/JSON export |
| `components/CurismPanel.tsx` | CURISM overview + dimension + per-repo evidence UI |
| `components/Header.tsx` | Shared nav, theme toggle, share |
| `app/page.tsx` | Scanner UI: hero/search, profile, metrics, languages, repos |
| `app/jobs/page.tsx` | Job application tracker (browser-local persistence) |

## CURISM© scoring

Each repository is scored 0–100 across six dimensions (displayed C-U-R-I-S-M):

| Dimension | Signals |
| --------- | ------- |
| **C**ommission / Contribution | push recency, repo size, archived/fork caps |
| **U**niqueness | ACID layout, cross-domain scope, docs culture |
| **R**eliability | tests in tree, CI workflows, Dockerfile, lockfile |
| **I**nfluence | log-scaled stars + forks |
| **S**ecurity | committed secrets, `.gitignore`, `SECURITY.md`, lockfiles |
| **M**aintainability | README depth, license, TS/ESLint config, structure |

Aggregation (`aggregateProfile`):

```
Hard    = (R + S + M) / 3
Soft    = (I + C) / 2
Builder = U   (ACID)
Overall = 30%·Hard + 40%·Soft + 30%·Builder
```

Repo scores are influence-weighted (`(1 + stars/100)^0.5`) before averaging.
Grades: S+ ≥ 89.1, S ≥ 73.4, A ≥ 58.9, B ≥ 50.1, else C. Every dimension emits
`evidence` strings surfaced in the per-repo expandable rows.

## Theming

The UI is **dark by default** with a light theme toggle:

- `app/globals.css` defines a token set (`--surface-*`, `--ink-*`, `--g-*`, `--line*`)
  per theme, and `@theme inline` remaps Tailwind's `slate`, `white`, and
  bright-green utilities onto those variables.
- `app/layout.tsx` injects a small inline script that sets
  `data-theme="light"` from `localStorage("gp-theme")` (or `prefers-color-scheme`)
  before first paint to avoid a flash.
- `components/Header.tsx` renders the sun/moon toggle and persists the choice.
- Reusable surfaces live in `globals.css`: `.panel`, `.panel-deep`, `.micro`,
  `.num`, `.field`, `.btn-prime`, `.btn-ghost`, `.ring-hover` — all variable-driven.

## Job tracker

`/jobs` is a client-rendered SPA persisted to `localStorage("gitpulse.jobs.v1")`
(no server storage). `lib/jobs.ts` owns the model (status pipeline, next steps,
response-rate stats), status metadata, and `toCSV`/`downloadFile` for backup.
The API routes never touch job data.

## Developer resources

### Environment

| Variable | Purpose |
| -------- | ------- |
| `GITHUB_TOKEN` | Sets the REST API token (`lib/github-server.ts`) for higher rate limits |

### Commands

```bash
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # type gate
npm run build        # production build gate
npm run start        # serve the production build
npm run lint         # static lint gate
```

### API surface

| Endpoint | Description |
| -------- | ----------- |
| `GET /api/scan?user=<handle>&limit=<1-30>&mode=auto\|api\|html` | Full scan (cached). Default `limit=15`, `mode=auto`. |
| `GET /api/scan/progress?user=<handle>` | Poll in-flight progress `{ running, phase, completed, total, current }` |

### Extending with a new scan signal

1. Add the signal field to `RepoSignals` in `lib/curism.ts` and to
   `defaultSignals`.
2. Populate it in `lib/github-server.ts` (`scanRepo`, API path) and/or
   `lib/github-html.ts` (`analyzeZip`, HTML path).
3. Score it in `computeSix` and push human-readable `evidence`.
4. If the signal depends on path names, add a regex to `lib/tree-classify.ts`
   (`classifyPaths`) so both paths share it.

## Project structure

```
gitpulse/
├─ app/
│  ├─ api/scan/route.ts            # scan orchestrator (+ HTML fallback)
│  ├─ api/scan/progress/route.ts
│  ├─ globals.css                  # design tokens, themes, component classes
│  ├─ layout.tsx                   # root layout + no-flash theme script
│  ├─ page.tsx                     # scanner UI
│  └─ jobs/page.tsx                # job tracker UI
├─ components/
│  ├─ CurismPanel.tsx
│  └─ Header.tsx
├─ lib/
│  ├─ curism.ts · github.ts · github-server.ts · github-html.ts
│  ├─ tree-classify.ts · scan-store.ts · jobs.ts
├─ next.config.ts · package.json · tsconfig.json
└─ README.md · ARCHITECTURE.md · CONTRIBUTING.md · CODE_OF_CONDUCT.md · LICENSE
```
# GitPulse Insights — GitHub Profile + CURISM© Scanner

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org)

A Next.js app that scans any GitHub profile and produces an insights dashboard plus
per-repo **CURISM©** ratings (Reliability, Security, Maintainability, Uniqueness,
Contribution, Influence) scored on a **0–100** scale.

- **Live GitHub data** — profile, repos, languages via the REST API (server-side to dodge browser CORS/quota).
- **Deep repo scan** — fetches each repo's file tree, checks for README thread, license, lockfiles, CI workflows, tests, `.gitignore`, and committed secret files; reads READMEs from `raw.githubusercontent.com`.
- **CURISM© aggregate** — `Overall = 30%·Hard(S,M,R) + 40%·Soft(I,C) + 30%·Builder(Uniqueness)`, weighted per-repo influence.
- **Progress UI** — live scan progress per repo (`/api/scan/progress`).
- **Job tracker** — `/jobs`: add, edit, filter, and track job applications (status pipeline, interviews, offers, response-rate stats, notes/contacts, next steps) with local JSON backup/CSV export, persisted in the browser.
- **Offline fallback** — mock profiles for `ogc16`, `torvalds`, `gaearon` when the API is unreachable.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Scanning is rate-limited to GitHub's unauthenticated quota (60 req/hr per server IP).
For full-speed deep scans set a token:

```bash
# .env.local
GITHUB_TOKEN=ghp_xxx
```

## Rate-limit resilience

If the REST API quota is exhausted, the scanner **automatically falls back** to
scraping GitHub's public HTML (profile, repo list, per-repo metadata) and
downloading source archives from `codeload.github.com`, analyzing them locally:

- No token needed — HTML pages and codeload zips are quota-free.
- Deep signals (tests, CI, lockfiles, secrets, language mix) are read straight from the zip.
- The response includes `mode: "api" | "html"` so the UI can show which path was used.
- Force the fallback manually: `GET /api/scan?user=<handle>&mode=html`.

## Scoring model (heuristic)

| Dimension   | Key signals                                                        |
| ----------- | ------------------------------------------------------------------ |
| Security    | `.env`/key files committed, `.gitignore`, `SECURITY.md`, lockfiles  |
| Reliability | tests in tree, GitHub Actions / CI config, Dockerfile, lockfile     |
| Maintainability | README depth, license, TS/ESLint config, layered structure      |
| Uniqueness  | architecture layout (ACID), cross-domain scope, docs culture, innovation heuristic |
| Contribution| push recency, repo size, archived/fork caps                        |
| Influence   | log-scaled stars + forks                                            |

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest — 49 tests across 5 suites
npm run build      # production build (type-check + lint + bundle)
```

Enter any GitHub handle and hit **Scan**. The dashboard renders the CURISM©
breakdown for every public repo, weighted by per-repo signal strength, then
rolls them into an overall profile rating.

## Configuration

| Variable       | Purpose                                                            |
| -------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SCAN_TIMEOUT` | Fallback HTTP timeout (ms) for profile/repo fetches   |
| `GITHUB_TOKEN` | API token — raises unauthenticated quota (60 req/hr → 5000 req/hr) |
| `GITPULSE_MOCK` | `1` to serve offline fallback profiles unconditionally |

Set them in `.env.local`:

```bash
# .env.local
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

## API

- `GET /api/scan?user=<handle>&limit=15&mode=auto` — runs (or serves cached) scan; returns `{ mode, profile, userData, reposData, tip }`. `mode` is `auto` (API → HTML fallback), `api`, or `html`.
- `GET /api/scan/progress?user=<handle>` — `{ running, phase, completed, total, current }`.
- `GET /api/scan?user=<handle>&mode=html` — force the quota-free HTML fallback.

### Sample response

```json
{
  "mode": "api",
  "profile": { "login": "ogc16", "name": "Caleb Ngeno" },
  "userData": { "publicRepos": 17, "followers": 12, "overall": 61, "grade": "A" },
  "reposData": [
    {
      "name": "gitpulse",
      "stars": 0,
      "curism": { "overall": 72.4, "grade": "S", "scores": {
        "scalability": 68, "maintainability": 81, "reliability": 74,
        "uniqueness": 71, "security": 66, "mobility": 63 } }
    }
  ],
  "tip": "Add SECURITY.md and a CI workflow to lift Maintainability + Security."
}
```

## Scan pipeline (high level)

1. **Profile + repo list** — GitHub REST `/users/{user}`, `/users/{user}/repos`.
2. **Per-repo file tree** — `git/trees/{ref}?recursive=1` (dodges default 1000-~entry limit).
3. **Deep signals** — grep the tree for README depth, license, lockfiles, CI
   workflows, Dockerfile, tests, ESLint/TS config, and committed secret files;
   read each README via `raw.githubusercontent.com` to measure documentation depth.
4. **Scoring** — CURISM© heuristic (see table below); influence dims are
   log-scaled so a handful of stars vs. thousands don't swamp other signals.
5. **Fallback** — if the REST quota is gone, re-scan with `mode=html`, which
   pulls HTML pages + codeload zips, quota-free.
6. **Progress** — `/api/scan/progress` writes `{ phase, completed, total }` as
   each repo finishes so the UI can render a live bar.

## Scoring model (heuristic)

| Dimension         | Key signals used                                                        |
| ----------------- | ----------------------------------------------------------------------- |
| **S**calability   | archive layout, complexity signature, `any`-type spills, lockfile       |
| **M**aintainability | README depth, license, `SECURITY.md`, tests, ESLint/TS config, lints   |
| **R**eliability    | CI config, Dockerfile, .gitignore, lockfile, tests, Makefile, editorconfig |
| **U**niqueness     | architecture layout (ACID), cross-domain scope, docs culture, innovation heuristic |
| **S**ecurity       | committed `.env`/key files, `SECURITY.md`, lockfile, `.editorconfig`     |
| **M**obility       | Dockerfile, CI, portability signals, contribution-influence weighting     |

> Signals are evidence-backed: every committed secret, missing README, or absent
> license shows up as a human-readable bullet in the dashboard, so a low score is
> never a mystery.

## Offline fallback profiles

When the GitHub API (or network) is unreachable, the app serves three built-in
mock profiles so the UI stays fully functional for demos and development:
`ogc16`, `torvalds`, and `gaearon`. Each includes a curated repo set with
realistic CURISM© breakdowns.

## Security & secrets

The scanner deliberately **flags** committed `.env`, key, and credential files
as suspicious — because secrets in git history are a top GitHub-leak vector.
Follow these guardrails on your own repos:

- Add `.env*` template files (`.env.example`) instead of real values.
- Put a `.gitignore` in place before the first commit.
- Add `SECURITY.md` with a reporting policy.
- Never commit `*.pem`, `id_rsa`, or `*.key`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, code standards, and how to add
a new scan signal. Architectural context lives in [ARCHITECTURE.md](ARCHITECTURE.md).

## Tech

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · lucide-react · TypeScript

## Documentation

- [Architecture](ARCHITECTURE.md) — system design, module map, scan pipeline, developer resources
- [Contributing](CONTRIBUTING.md) — setup, coding standards, how to add a scan signal
- [Code of Conduct](CODE_OF_CONDUCT.md)

## License

Licensed under the [MIT License](LICENSE). Copyright © 2026 Caleb Ngeno.
Contributions are welcome — see [Contributing](CONTRIBUTING.md).
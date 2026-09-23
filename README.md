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

## API

- `GET /api/scan?user=<handle>&limit=15&mode=auto` — runs (or serves cached) scan; returns `{ mode, profile, userData, reposData, tip }`. `mode` is `auto` (API → HTML fallback), `api`, or `html`.
- `GET /api/scan/progress?user=<handle>` — `{ running, phase, completed, total, current }`.

## Tech

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · lucide-react · TypeScript

## Documentation

- [Architecture](ARCHITECTURE.md) — system design, module map, scan pipeline, developer resources
- [Contributing](CONTRIBUTING.md) — setup, coding standards, how to add a scan signal
- [Code of Conduct](CODE_OF_CONDUCT.md)

## License

Licensed under the [MIT License](LICENSE). Copyright © 2026 Caleb Ngeno.
Contributions are welcome — see [Contributing](CONTRIBUTING.md).
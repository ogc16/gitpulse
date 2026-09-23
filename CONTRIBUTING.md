# Contributing to GitPulse Insights

Thanks for taking the time to contribute! This project scans GitHub profiles and
ranks repositories with the CURISM© model. We welcome bug reports, feature
requests, documentation, and pull requests.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) — it applies to
all community interactions, including issues and pull requests.

## Getting started

```bash
git clone https://github.com/ogc16/gitpulse.git
cd gitpulse
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and scan a profile (try
`ogc16` or `torvalds`).

### Rate limits

The default scan uses GitHub's unauthenticated REST quota (60 req/hr per server
IP). For full-speed deep scans, create `.env.local`:

```bash
GITHUB_TOKEN=ghp_xxx
```

Never commit `.env*` files — they are gitignored.

## Project layout

```
app/                 # App Router: / (scanner), /jobs (tracker), api/scan routes
components/          # CurismPanel, Header
lib/                 # github-server (REST), github-html (HTML fallback),
                     # tree-classify (path signals), curism (scoring), jobs (tracker)
docs/                # ARCHITECTURE.md — system design, scan pipeline
scripts/             # verify.mjs — lint + typecheck + tests + build in one pass
```

A deeper walkthrough lives in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Adding a new scan signal

1. Add the field to `RepoSignals` and `defaultSignals` in `lib/curism.ts`.
2. Populate it in both scan paths:
   - REST path: `lib/github-server.ts` (`scanRepo`)
   - HTML/zip path: `lib/github-html.ts` (`analyzeZip`)
3. Score it inside `computeSix` in `lib/curism.ts` and push human-readable
   evidence strings.
4. If the signal depends on file paths, add a regex to `lib/tree-classify.ts`
   (`classifyPaths`) so both paths stay in sync.
5. Verify with `npx tsc --noEmit` and `npm run build`.

## Coding standards

- TypeScript, strict. No `any` unless unavoidable.
- No inline comments unless the logic genuinely needs explanation.
- Follow existing component patterns (client components, `tailwind` classes,
  theme tokens from `globals.css`). Avoid hard-coded hex colors — use the
  `--ink-*` / `--surface-*` variables or Tailwind `slate`/`green` utilities.
- Keep dark and light themes working; new UI must look right in both.

## Commit messages

Use clear, imperative messages that describe intent:

```
feat(scan): add stack-overflow reputation signal
fix(html): tolerate missing zip headers on codeload
```
Simple one-liners are fine for small changes; prefix with a scope when touching
a specific module.

## Pull request process

1. Fork the repo and create a feature branch (`git checkout -b feat/my-change`).
2. Make your change and commit.
3. Run the verification gates (`npx tsc --noEmit`, `npm run build`, ideally
   `npm run lint`).
4. Push and open a PR. Describe what changed and why; include screenshots for
   UI changes.

## Reporting issues

Include: expected vs. actual behavior, the username scanned (if relevant),
whether the response reported `mode: api` or `mode: html`, and any console or
server output. Rate-limit errors (403/REST quota) are expected on shared IPs —
note whether a `GITHUB_TOKEN` is configured.

## License

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
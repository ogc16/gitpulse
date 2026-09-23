# Security Policy

GitPulse scans third-party repositories for committed secrets and reports what it
finds. Because the project operates on untrusted tree data, we take the security
of the scanner itself just as seriously as we do the repos it inspects.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

We support the latest release line. Older versions receive security fixes only on
a best-effort basis.

## Reporting a Vulnerability

**Do not open a public issue.** Please report security vulnerabilities privately
so we can fix them before they are disclosed.

- **Preferred:** Open a private advisory on GitHub
  (Security → New advisory) for this repository.
- **Email:** security@gitpulse.example.com (PGP key available on request)

You should receive a first response within 72 hours. If you don't, please follow
up on the advisory thread or via a second email. We will keep you updated on the
progress of the fix, coordinate a release date with you, and credit you in the
release notes unless you prefer to remain anonymous.

## What We Consider a Vulnerability

The scanner and its server process untrusted input — file paths, GitHub HTML,
and archive contents. Any of the following within scope:

- **Command / path traversal** — a crafted path or payload escaping the scanner's
  working directory or triggering execution of unintended code.
- **Zip-slip / archive extraction** — entries in a downloaded repo archive that
  write outside the extraction directory (we mitigate with `adm-zip` entry
  validation and path containment).
- **Server-Side Request Forgery (SSRF)** — redirects or crafted URLs in the scan
  flow being used to reach internal services.
- **Injection** into the CSV export, scan output, or HTML rendering — including
  CSV formula injection from untrusted cell data (leading `=`, `+`, `-`, `@`).
- **Information disclosure** — a committed secret or a repo's private data
  becoming visible to other users.
- **Denial of service** — unbounded archive size, depth, or file count exhausting
  memory or CPU during a scan.
- **Dependency vulnerabilities** — known CVEs in our runtime or build toolchain.

## Out of Scope

- The security posture of the **repos being scanned** (that is the scanner's
  *output*, not a vulnerability in GitPulse itself).
- Physical / social engineering attacks.
- Issues that require already-compromised credentials.

## Security Best Practices (for your own repos)

If you are using GitPulse to rate your own projects, the fastest wins are:

1. Never commit `.env` files, private keys (`.pem`, `id_rsa`, `*.key`), or
   credential files — add them to `.gitignore` and use template files
   (`.env.example`) instead.
2. Add `SECURITY.md`, a `LICENSE`, and a real README.
3. Commit a lockfile and set up CI (`.github/workflows/ci.yml`) so tests and
   builds gate every merge.
4. Prefer Dockerfile + `.editorconfig` + `.dockerignore` for reproducibility and
   editor consistency.

## Disclosure Timeline

- **T+0** — report received; acknowledgement sent.
- **T+72h** — triage and confirmation of impact.
- **T+14d** — fix prepared against the latest release.
- **T+30d** — coordinated public disclosure (or sooner if a fix ships earlier).

## Thanks

We are grateful to everyone who takes the time to report issues responsibly.

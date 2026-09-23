import { NextRequest } from "next/server";
import { aggregateProfile, ProfileCurism } from "@/lib/curism";
import {
  fetchUser,
  fetchRepos,
  scanRepo,
  scanRepoMetadataOnly,
  selectRepos,
  RateLimitError,
  NotFoundError,
  RawGitHubUser,
  RawGitHubRepo,
} from "@/lib/github-server";
import { scanHtml } from "@/lib/github-html";
import { getFreshScan, setScanResult, setProgress, ScanResult } from "@/lib/scan-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalizeUser = (u: string) => u.trim().replace(/^@/, "").replace(/https?:\/\/github\.com\//, "");

const USER_FIELDS: (keyof RawGitHubUser)[] = [
  "login",
  "name",
  "avatar_url",
  "html_url",
  "bio",
  "company",
  "location",
  "blog",
  "twitter_username",
  "followers",
  "following",
  "public_repos",
  "created_at",
  "type",
];

const REPO_FIELDS: (keyof RawGitHubRepo)[] = [
  "id",
  "name",
  "full_name",
  "html_url",
  "description",
  "language",
  "stargazers_count",
  "forks_count",
  "size",
  "archived",
  "fork",
  "pushed_at",
  "created_at",
  "updated_at",
  "default_branch",
  "license",
];

function thinUser(u: RawGitHubUser) {
  const out: Record<string, unknown> = {};
  for (const k of USER_FIELDS) out[k] = u[k];
  return out;
}

function thinRepo(r: RawGitHubRepo) {
  const out: Record<string, unknown> = {};
  for (const k of REPO_FIELDS) out[k] = r[k];
  return out;
}

export async function runApiScan(user: string, limit: number): Promise<ScanResult> {
  const guser = await fetchUser(user);
  const repos = await fetchRepos(user);
  const { analyzed, metadataOnly } = selectRepos(repos, limit);

  setProgress(user, {
    user,
    phase: "analyzing",
    completed: 0,
    total: analyzed.length,
    current: analyzed[0]?.name ?? null,
    limit,
  });

  const analyzedScores = [];
  let rateLimited = false;
  for (let i = 0; i < analyzed.length; i++) {
    const repo = analyzed[i];
    setProgress(user, {
      user,
      phase: "analyzing",
      completed: i,
      total: analyzed.length,
      current: repo.name,
      limit,
    });
    try {
      analyzedScores.push(await scanRepo(repo));
    } catch (err) {
      if (err instanceof RateLimitError) {
        rateLimited = true;
        analyzedScores.push(await scanRepoMetadataOnly(repo));
        break;
      }
      analyzedScores.push(await scanRepoMetadataOnly(repo));
    }
  }

  const metadataScores = [];
  for (const repo of metadataOnly) {
    metadataScores.push(await scanRepoMetadataOnly(repo));
  }

  const profile: ProfileCurism = aggregateProfile(
    user,
    [...analyzedScores, ...metadataScores],
    new Date().toISOString(),
  );

  const tip = rateLimited
    ? "GitHub API rate limit hit mid-scan — remaining repos were scored from metadata only. Set the GITHUB_TOKEN environment variable for a full deep scan."
    : undefined;

  const result: ScanResult = {
    cached: false,
    mode: "api",
    profile,
    userData: thinUser(guser),
    reposData: repos.map(thinRepo),
    tip,
  };
  return result;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("user") ?? "";
  const user = normalizeUser(raw);
  if (!user) {
    return Response.json({ error: "Missing 'user' query parameter." }, { status: 400 });
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(30, Math.round(limitRaw))) : 15;
  const mode = req.nextUrl.searchParams.get("mode") ?? "auto";

  const cached = getFreshScan(user);
  if (cached) {
    return Response.json({ ...cached, cached: true });
  }

  setProgress(user, { user, phase: "fetching", completed: 0, total: 0, current: null, limit });

  try {
    let result: ScanResult;
    if (mode === "html") {
      result = await scanHtml(user, limit);
    } else {
      try {
        result = await runApiScan(user, limit);
      } catch (err) {
        if (err instanceof RateLimitError) {
          result = await scanHtml(user, limit);
        } else {
          throw err;
        }
      }
    }
    setScanResult(user, result);
    return Response.json(result);
  } catch (err) {
    setProgress(user, { user, phase: "error", completed: 0, total: 0, current: null, limit });
    if (err instanceof NotFoundError) {
      return Response.json({ error: `GitHub user "${user}" not found.` }, { status: 404 });
    }
    if (err instanceof RateLimitError) {
      return Response.json(
        { error: "GitHub pages are temporarily refusing requests (429). Try again in a few minutes." },
        { status: 429 },
      );
    }
    return Response.json({ error: err instanceof Error ? err.message : "Scan failed unexpectedly." }, { status: 500 });
  }
}
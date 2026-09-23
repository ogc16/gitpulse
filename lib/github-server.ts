import { defaultSignals, scoreRepo, RepoSignals, CurismRepoScore } from "./curism";
import { classifyPaths, README_RE } from "./tree-classify";

export const API = "https://api.github.com";
export const RAW = "https://raw.githubusercontent.com";

export class RateLimitError extends Error {
  constructor() {
    super("GitHub API rate limit exceeded");
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

let token: string | undefined;
export function setToken(value?: string) {
  token = value;
}
export function getToken(): string | undefined {
  if (token === undefined) token = process.env.GITHUB_TOKEN;
  return token;
}

export function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "gitpulse-scan",
  };
  const t = getToken();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function ghJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(25000), cache: "no-store" });
  if (res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")) {
    throw new RateLimitError();
  }
  if (res.status === 404) throw new NotFoundError(`404 on ${url}`);
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${url}`);
  return (await res.json()) as T;
}

export interface RawGitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitter_username: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  type: string;
}

export interface RawGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  size: number;
  archived: boolean;
  fork: boolean;
  pushed_at: string;
  created_at: string;
  updated_at: string;
  default_branch: string;
  license: { name: string } | null;
}

export async function fetchUser(login: string): Promise<RawGitHubUser> {
  return ghJson<RawGitHubUser>(`${API}/users/${encodeURIComponent(login)}`);
}

export async function fetchRepos(login: string): Promise<RawGitHubRepo[]> {
  const out: RawGitHubRepo[] = [];
  for (let page = 1; page <= 3; page++) {
    const chunk = await ghJson<RawGitHubRepo[]>(
      `${API}/users/${encodeURIComponent(login)}/repos?per_page=100&page=${page}&sort=updated`,
    );
    out.push(...chunk);
    if (chunk.length < 100) break;
  }
  return out;
}

async function fetchRaw(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function buildSignals(repo: RawGitHubRepo): Promise<RepoSignals> {
  const base = defaultSignals({
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    sizeKB: repo.size,
    pushedDaysAgo: Math.max(0, Math.round((Date.now() - new Date(repo.pushed_at).getTime()) / 86400000)),
    archived: repo.archived,
    fork: repo.fork,
    language: repo.language,
    description: repo.description ?? "",
    isAnalyzed: true,
  });

  try {
    const [owner, name] = repo.full_name.split("/");
    const tree = await ghJson<{ truncated: boolean; tree: { path: string; type: string }[] }>(
      `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`,
    );
    const entries = (tree.tree ?? []).filter((e) => e.type === "blob").map((e) => e.path);
    if (tree.truncated || entries.length > 25000) {
      base.isAnalyzed = false;
      return base;
    }

    const cls = classifyPaths(entries);
    base.fileCount = cls.fileCount;
    base.dirCount = cls.dirCount;
    base.complexDirs = cls.complexDirs;
    base.multiApp = cls.multiApp;
    base.srcIndex = cls.srcIndex;
    base.hasReadme = cls.hasReadme;
    base.hasLicense = cls.hasLicense;
    base.hasSecurityMd = cls.hasSecurityMd;
    base.hasContributing = cls.hasContributing;
    base.hasCodeOfConduct = cls.hasCodeOfConduct;
    base.hasGitignore = cls.hasGitignore;
    base.hasEditorconfig = cls.hasEditorconfig;
    base.hasPrettier = cls.hasPrettier;
    base.hasEslint = cls.hasEslint;
    base.hasTsconfig = cls.hasTsconfig;
    base.hasLockfile = cls.hasLockfile;
    base.hasWorkflows = cls.hasWorkflows;
    base.hasOtherCI = cls.hasOtherCI;
    base.hasDockerfile = cls.hasDockerfile;
    base.hasMakefile = cls.hasMakefile;
    base.hasTests = cls.hasTests;
    base.manyTests = cls.manyTests;
    base.secretFiles = [...cls.secretFiles];

    if (cls.readmePath) {
      const readmeName = cls.readmePath;
      const [owner, name] = repo.full_name.split("/");
      const encPath = readmeName.split("/").map(encodeURIComponent).join("/");
      const text = await fetchRaw(`${RAW}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/${repo.default_branch}/${encPath}`);
      base.readmeBytes = text ? Buffer.byteLength(text, "utf8") : 0;
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    base.isAnalyzed = false;
  }

  try {
    const [owner, name] = repo.full_name.split("/");
    const lang = await ghJson<Record<string, number>>(
      `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/languages`,
    );
    const total = Object.values(lang).reduce((a: number, b) => a + b, 0) || 1;
    base.languages = Object.entries(lang)
      .map(([name, bytes]) => ({ name, proportion: bytes / total }))
      .sort((a, b) => b.proportion - a.proportion);
  } catch {
    if (repo.language) base.languages = [{ name: repo.language, proportion: 1 }];
  }

  return base;
}

export async function scanRepo(repo: RawGitHubRepo): Promise<CurismRepoScore> {
  const signals = await buildSignals(repo);
  return scoreRepo(repo.name, signals);
}

export async function scanRepoMetadataOnly(repo: RawGitHubRepo): Promise<CurismRepoScore> {
  const signals = defaultSignals({
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    sizeKB: repo.size,
    pushedDaysAgo: Math.max(0, Math.round((Date.now() - new Date(repo.pushed_at).getTime()) / 86400000)),
    archived: repo.archived,
    fork: repo.fork,
    language: repo.language,
    description: repo.description ?? "",
    isAnalyzed: false,
  });
  return scoreRepo(repo.name, signals);
}

export interface ScanSelection {
  analyzed: RawGitHubRepo[];
  metadataOnly: RawGitHubRepo[];
}

export function selectRepos(repos: RawGitHubRepo[], limit: number): ScanSelection {
  const scored = [...repos].sort(
    (a, b) =>
      b.stargazers_count - a.stargazers_count ||
      b.size - a.size ||
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
  const nonFork = scored.filter((r) => !r.fork);
  const fork = scored.filter((r) => r.fork);
  return {
    analyzed: [...nonFork, ...fork].slice(0, limit),
    metadataOnly: scored.slice(limit),
  };
}
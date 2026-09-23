import AdmZip from "adm-zip";
import { aggregateProfile, defaultSignals, ProfileCurism, RepoSignals, scoreRepo, CurismRepoScore } from "./curism";
import { classifyPaths, languagesFromPaths } from "./tree-classify";
import { RateLimitError, NotFoundError, scanRepoMetadataOnly, RawGitHubRepo, RawGitHubUser } from "./github-server";
import { setProgress, ScanResult } from "./scan-store";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MAX_ZIP_BYTES = 150 * 1024 * 1024;

export class HtmlBlockedError extends Error {
  constructor() {
    super("GitHub pages are temporarily refusing requests (429). Try again later.");
  }
}

async function getHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000), cache: "no-store" });
  if (res.status === 429 || res.status === 403) {
    throw new RateLimitError();
  }
  if (!res.ok) throw new NotFoundError(`github.com returned ${res.status} for ${url}`);
  return res.text();
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, "")
    .trim();

const num = (s: string | undefined | null): number => {
  if (!s) return 0;
  const m = s.replace(/,/g, "").match(/([\d.]+)([kKmM]?)/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (/[kKmM]/.test(m[2])) return Math.round(n * 1000);
  return Math.round(n);
};

function grab(html: string, from: string, to: string, start = 0): string | null {
  const i = html.indexOf(from, start);
  if (i < 0) return null;
  const j = html.indexOf(to, i + from.length);
  if (j < 0) return null;
  return html.slice(i + from.length, j);
}

function grabStr(html: string, key: string): string | null {
  return grab(html, `"${key}":"`, `"`);
}

function grabBool(html: string, key: string): boolean | null {
  const v = grab(html, `"${key}":`, ",");
  if (v === null) return null;
  return v.trim() === "true";
}

function grabNum(html: string, key: string): number {
  const v = grab(html, `"${key}":`, ",");
  const n = v ? Number(v.replace(/[^0-9.-]/g, "")) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function browserDate(s: string): string {
  const m = s?.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  return m ? m[0] + "Z" : new Date().toISOString();
}

export function parseProfile(login: string, html: string): RawGitHubUser {
  const name = grab(html, `class="p-name vcard-fullname d-block overflow-hidden"`, "</span>");
  const bio = grab(html, 'data-bio-text="', '"') ?? grab(html, 'property="og:description" content="', '"');
  const imgRaw = grab(html, 'property="og:image" content="', '"');
  const website = grab(html, 'rel="nofollow me" class="Link--primary wb-break-all" href="', '"');
  const location = grab(html, 'aria-label="Location"', "</li>") ?? grab(html, 'itemprop="homeLocation"', "</span>");
  const company = grab(html, 'aria-label="Company"', "</li>");
  return {
    login,
    name: name?.trim() ?? login,
    avatar_url: imgRaw ?? `https://github.com/${encodeURIComponent(login)}.png`,
    html_url: `https://github.com/${encodeURIComponent(login)}`,
    bio: bio ? decodeEntities(bio.replace(/- ${login}/, "")) : null,
    company: company ? decodeEntities(company) : null,
    location: location ? decodeEntities(location) : null,
    blog: website ?? "",
    twitter_username: null,
    followers: 0,
    following: 0,
    public_repos: 0,
    created_at: new Date().toISOString(),
    type: "User",
  };
}

export interface ParsedRepoListEntry {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updated: string;
  fork: boolean;
}

export function parseRepositories(html: string): ParsedRepoListEntry[] {
  const re = /href="\/[^/"]+\/([^/\"#?]+)" itemprop="name codeRepository"/g;
  const matches: { index: number; name: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) matches.push({ index: m.index, name: m[1] });

  const out: ParsedRepoListEntry[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : html.length;
    const block = html.slice(Math.max(0, start), end);

    const desc = grab(block, 'itemprop="description">', "</p>");
    const lang = grab(block, 'itemprop="programmingLanguage">', "<");
    const starM = block.match(/octicon-star[\s\S]*?<\/svg>\s*([\d,.]+[kKmM]?)\s*<\/a>/i);
    const forkM = block.match(/octicon-repo-forked[\s\S]*?<\/svg>\s*([\d,.]+[kKmM]?)/i);
    const updated =
      grab(block, "<relative-time datetime=\"", "\"") ?? grab(block, 'class="no-wrap" datetime="', '"') ?? grab(block, "datetime=\"", "\"");
    const idM = block.match(/repository_id:(\d+)/);

    out.push({
      id: idM ? Number(idM[1]) : i + 1,
      name: matches[i].name,
      description: desc ? decodeEntities(desc) : null,
      language: lang?.trim() || null,
      stars: starM ? num(starM[1]) : 0,
      forks: forkM ? num(forkM[1]) : 0,
      updated: updated ? browserDate(updated) : new Date().toISOString(),
      fork: block.includes("repository_is_fork:true"),
    });
  }
  return out;
}

export interface ParsedRepoPage {
  id: number;
  defaultBranch: string;
  isFork: boolean;
  isArchived: boolean;
  stargazers: number;
  forks: number;
  language: string | null;
  description: string | null;
  pushedAt: string;
  createdAt: string;
}

export function parseRepoPage(html: string): ParsedRepoPage | null {
  const idm = html.match(/\{"id":(\d+),"defaultBranch":"([^"]*)"/);
  if (!idm) return null;
  const primaryLanguage =
    grabStr(html, "primaryLanguage") ?? grab(html, '"primaryLanguage":{"name":"', '"');
  return {
    id: Number(idm[1]),
    defaultBranch: idm[2],
    isFork: grabBool(html, "isFork") ?? false,
    isArchived: grabBool(html, "isArchived") ?? false,
    stargazers: grabNum(html, "stargazerCount"),
    forks: grabNum(html, "forksCount"),
    language: primaryLanguage || null,
    description: grabStr(html, "description"),
    pushedAt: browserDate(grabStr(html, "pushedAt") ?? ""),
    createdAt: browserDate(grabStr(html, "createdAt") ?? "2020-01-01"),
  };
}

export async function fetchUserHtml(login: string): Promise<RawGitHubUser> {
  const html = await getHtml(`https://github.com/${encodeURIComponent(login)}`);
  return parseProfile(login, html);
}

export async function fetchReposHtml(login: string): Promise<{ repos: ParsedRepoListEntry[]; count: number }> {
  const all: ParsedRepoListEntry[] = [];
  for (let page = 1; page <= 8; page++) {
    const html = await getHtml(`https://github.com/${encodeURIComponent(login)}?tab=repositories&page=${page}`);
    const batch = parseRepositories(html);
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 20) break;
  }
  const seen = new Set<string>();
  const uniq = all.filter((r) => (seen.has(r.name) ? false : (seen.add(r.name), true)));
  return { repos: uniq, count: uniq.length };
}

export async function fetchRepoPageHtml(login: string, name: string): Promise<ParsedRepoPage | null> {
  try {
    const html = await getHtml(`https://github.com/${encodeURIComponent(login)}/${encodeURIComponent(name)}`);
    return parseRepoPage(html);
  } catch {
    return null;
  }
}

async function downloadZip(login: string, name: string, branch: string): Promise<Buffer | null> {
  const branches = [branch, "master", "main"].filter((b, i, a) => a.indexOf(b) === i);
  for (const b of branches) {
    try {
      const res = await fetch(
        `https://codeload.github.com/${encodeURIComponent(login)}/${encodeURIComponent(name)}/zip/refs/heads/${encodeURIComponent(b)}`,
        { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(90000), cache: "no-store" },
      );
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > MAX_ZIP_BYTES) return null;
      return buf;
    } catch {
      /* try next branch */
    }
  }
  return null;
}

const stripTopFolder = (name: string): string => {
  const parts = name.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : parts[0];
};

const SECRET_CONTENT_RE =
  /(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|-----BEGIN (RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----|refresh_token\s*[:=]\s*["']?[A-Za-z0-9_]{20,}|client_secret\s*[:=]\s*["']?[A-Za-z0-9_]{12,})/i;

function toRepoRecord(
  user: string,
  e: ParsedRepoListEntry,
  page: ParsedRepoPage | null,
): RawGitHubRepo {
  return {
    id: page?.id ?? e.id,
    name: e.name,
    full_name: `${user}/${e.name}`,
    html_url: `https://github.com/${user}/${e.name}`,
    description: page?.description ?? e.description,
    language: page?.language ?? e.language,
    stargazers_count: page?.stargazers ?? e.stars,
    forks_count: page?.forks ?? e.forks,
    size: 0,
    archived: page?.isArchived ?? false,
    fork: page?.isFork ?? e.fork,
    pushed_at: page?.pushedAt ?? e.updated,
    created_at: page?.createdAt ?? e.updated,
    updated_at: page?.pushedAt ?? e.updated,
    default_branch: page?.defaultBranch ?? "main",
    license: null,
  };
}

function userRecord(u: RawGitHubUser, repoCount: number): RawGitHubUser {
  return { ...u, public_repos: repoCount };
}

export async function analyzeZip(
  login: string,
  name: string,
  zipBuf: Buffer,
  meta: { stars: number; forks: number; pushedDaysAgo: number; archived: boolean; fork: boolean; language: string | null; description: string },
): Promise<CurismRepoScore> {
  const zip = new AdmZip(zipBuf);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);
  const paths: string[] = [];
  const sizeByPath: Record<string, number> = {};
  const entryByPath: Record<string, { getData(): Buffer }> = {};
  let totalBytes = 0;
  for (const e of entries) {
    const p = stripTopFolder(e.entryName);
    if (!p || p.startsWith(".git/")) continue;
    const sz = typeof e.header.compressedSize === "number" ? e.header.compressedSize : e.getData().length;
    paths.push(p);
    sizeByPath[p] = sz;
    entryByPath[p] = e;
    totalBytes += sz;
  }

  const cls = classifyPaths(paths);
  const base: RepoSignals = defaultSignals({
    stars: meta.stars,
    forks: meta.forks,
    sizeKB: totalBytes / 1024,
    pushedDaysAgo: meta.pushedDaysAgo,
    archived: meta.archived,
    fork: meta.fork,
    language: meta.language,
    description: meta.description,
    isAnalyzed: true,
  });
  base.fileCount = cls.fileCount;
  base.dirCount = cls.dirCount;
  base.complexDirs = cls.complexDirs;
  base.multiApp = cls.multiApp;
  base.srcIndex = cls.srcIndex;
  base.hasReadme = cls.hasReadme;
  base.readmeBytes = cls.readmePath ? sizeByPath[cls.readmePath] ?? 0 : 0;
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

  const flagged = new Set(base.secretFiles);
  for (const p of cls.secretFiles) {
    if ((sizeByPath[p] ?? 0) > 262144) continue;
    try {
      const content = entryByPath[p].getData().toString("utf8");
      if (SECRET_CONTENT_RE.test(content)) flagged.add(p);
    } catch {
      /* content scan best-effort */
    }
  }
  base.secretFiles = [...flagged];

  const langsBytes = languagesFromPaths(paths, (p) => sizeByPath[p] ?? 0);
  const totalLang = langsBytes.reduce((a, b) => a + b.bytes, 0) || 1;
  base.languages = langsBytes.map((l) => ({ name: l.name, proportion: l.bytes / totalLang }));

  return scoreRepo(name, base);
}

export interface HtmlScanInput {
  user: RawGitHubUser;
  repos: ParsedRepoListEntry[];
  limit: number;
}

export async function scanHtml(login: string, limit: number): Promise<ScanResult> {
  setProgress(login, { user: login, phase: "fetching", completed: 0, total: 0, current: null, limit });

  const rawUser = await fetchUserHtml(login);
  const { repos } = await fetchReposHtml(login);

  const sorted = [...repos].sort((a, b) => b.stars - a.stars || new Date(b.updated).getTime() - new Date(a.updated).getTime());
  const analyzed = sorted.slice(0, limit);

  setProgress(login, { user: login, phase: "analyzing", completed: 0, total: analyzed.length, current: analyzed[0]?.name ?? null, limit });

  const scored: CurismRepoScore[] = [];
  let zipFailures = 0;
  for (let i = 0; i < analyzed.length; i++) {
    const e = analyzed[i];
    setProgress(login, { user: login, phase: "analyzing", completed: i, total: analyzed.length, current: e.name, limit });
    const page = await fetchRepoPageHtml(login, e.name);
    const rec = toRepoRecord(login, e, page);
    const pushedDaysAgo = Math.max(0, Math.round((Date.now() - new Date(rec.pushed_at).getTime()) / 86400000));
    try {
      const zip = await downloadZip(login, e.name, rec.default_branch || "main");
      if (zip) {
        scored.push(
          await analyzeZip(login, e.name, zip, {
            stars: rec.stargazers_count,
            forks: rec.forks_count,
            pushedDaysAgo,
            archived: rec.archived,
            fork: rec.fork,
            language: rec.language,
            description: rec.description ?? "",
          }),
        );
      } else {
        zipFailures++;
        scored.push(await scanRepoMetadataOnly(rec));
      }
    } catch {
      scored.push(await scanRepoMetadataOnly(rec));
    }
  }

  for (const e of sorted.slice(limit)) {
    const rec = toRepoRecord(login, e, null);
    scored.push(await scanRepoMetadataOnly(rec));
  }

  const profile: ProfileCurism = aggregateProfile(login, scored, new Date().toISOString());

  const reposData = [...sorted].map((e) => {
    const rec = toRepoRecord(login, e, null);
    return { ...rec, size: 0 };
  });

  const tip =
    zipFailures > 0
      ? `API quota exhausted — switched to HTML/Codeload scanning (no token needed). ${zipFailures} large repo(s) were scored from metadata only.`
      : "API quota exhausted — switched to HTML/Codeload scanning (no token needed).";

  return {
    cached: false,
    mode: "html",
    profile,
    userData: userRecord(rawUser, repos.length),
    reposData,
    tip,
  };
}
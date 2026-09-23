export type CurismKey = "S" | "M" | "R" | "I" | "C" | "U";

export function clamp(value: number, min = 0, max = 10): number {
  return Math.min(max, Math.max(min, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

const to100 = (value: number): number => Math.round(value * 10);

export function gradeFor(overall: number): string {
  if (overall >= 89.1) return "S+";
  if (overall >= 73.4) return "S";
  if (overall >= 58.9) return "A";
  if (overall >= 50.1) return "B";
  return "C";
}

export interface LanguageShare {
  name: string;
  proportion: number;
}

export interface RepoSignals {
  stars: number;
  forks: number;
  sizeKB: number;
  pushedDaysAgo: number;
  archived: boolean;
  fork: boolean;
  language: string | null;
  description: string;

  fileCount: number;
  dirCount: number;
  hasReadme: boolean;
  readmeBytes: number;
  hasLicense: boolean;
  hasSecurityMd: boolean;
  hasContributing: boolean;
  hasCodeOfConduct: boolean;
  hasGitignore: boolean;
  hasEditorconfig: boolean;
  hasPrettier: boolean;
  hasEslint: boolean;
  hasTsconfig: boolean;
  hasLockfile: boolean;
  hasWorkflows: boolean;
  hasOtherCI: boolean;
  hasDockerfile: boolean;
  hasMakefile: boolean;
  hasTests: boolean;
  manyTests: boolean;
  secretFiles: string[];
  multiApp: boolean;
  srcIndex: boolean;
  complexDirs: boolean;
  languages: LanguageShare[];
  descriptionLen: number;
  isAnalyzed: boolean;
}

export const defaultSignals = (meta: {
  stars: number;
  forks: number;
  sizeKB: number;
  pushedDaysAgo: number;
  archived: boolean;
  fork: boolean;
  language: string | null;
  description: string;
  isAnalyzed: boolean;
}): RepoSignals => ({
  ...meta,
  fileCount: 0,
  dirCount: 0,
  hasReadme: false,
  readmeBytes: 0,
  hasLicense: false,
  hasSecurityMd: false,
  hasContributing: false,
  hasCodeOfConduct: false,
  hasGitignore: false,
  hasEditorconfig: false,
  hasPrettier: false,
  hasEslint: false,
  hasTsconfig: false,
  hasLockfile: false,
  hasWorkflows: false,
  hasOtherCI: false,
  hasDockerfile: false,
  hasMakefile: false,
  hasTests: false,
  manyTests: false,
  secretFiles: [],
  multiApp: false,
  srcIndex: false,
  complexDirs: false,
  languages: [],
  descriptionLen: meta.description?.length ?? 0,
});

function crossDomainBoost(s: RepoSignals): number {
  const text = `${s.language ?? ""} ${s.description ?? ""}`.toLowerCase();
  let boost = 0;
  if (/payment|stripe|payroll|checkout|gateway/i.test(text)) boost += 1.0;
  if (/stream|video|rtmp|hls|broadcast/i.test(text)) boost += 1.0;
  if (/auth|oauth|sso|identity|jwt/i.test(text)) boost += 0.6;
  if (/security|ids|nids|lids|detection|threat/i.test(text)) boost += 0.8;
  if (/mobile|android|ios|swiftui|react native|flutter/i.test(text)) boost += 0.8;
  if (/infra|kubernetes|k8s|terraform|cloud|agent|platform/i.test(text)) boost += 0.8;
  if (/microservice|event|queue|redis|kafka|rabbit/i.test(text)) boost += 0.8;
  if (/ai|ml|llm|genai|langchain|model/i.test(text)) boost += 0.8;
  return boost;
}

const JSISH = ["JavaScript", "TypeScript", "Python", "Go", "Rust", "Java", "Ruby", "PHP", "Dart", "Swift", "Kotlin", "C#"];

export function computeSix(
  s: RepoSignals,
): { S: number; M: number; R: number; I: number; C: number; U: number; A: number; Cx: number; In: number; D: number; evidence: Record<CurismKey, string[]> } {
  const evidence: Record<CurismKey, string[]> = { S: [], M: [], R: [], C: [], I: [], U: [] };

  const hasSecrets = s.secretFiles.length > 0;

  let S = 6.0;
  if (s.hasSecurityMd) {
    S += 1.0;
    evidence.S.push("SECURITY.md present");
  }
  if (s.hasLockfile) {
    S += 0.8;
    evidence.S.push("Lockfile pins dependency versions");
  } else if (JSISH.includes(s.language ?? "")) {
    S -= 0.5;
    evidence.S.push("No lockfile for primary runtime");
  }
  if (s.hasGitignore) {
    S += 0.7;
    evidence.S.push(".gitignore present");
  } else {
    S -= 0.6;
    evidence.S.push("Missing .gitignore");
  }
  if (s.hasWorkflows && s.hasTests) S += 0.3;
  if (hasSecrets) {
    S -= 2.6;
    evidence.S.push(`Suspicious committed paths: ${s.secretFiles.slice(0, 3).join(", ")}`);
  }
  if (s.archived) S -= 0.4;
  S = clamp(S);

  let M = 4.0;
  const rb = s.readmeBytes;
  if (rb <= 0) evidence.M.push("No README found");
  else if (rb <= 500) {
    M += 0.8;
    evidence.M.push("README is minimal");
  } else if (rb <= 2000) {
    M += 1.4;
    evidence.M.push("README present");
  } else if (rb <= 6000) {
    M += 2.0;
    evidence.M.push("README with real documentation");
  } else {
    M += 2.4;
    evidence.M.push("Thorough README/docs");
  }
  if (s.hasLicense) {
    M += 0.8;
    evidence.M.push("License file");
  }
  if (s.hasTsconfig) {
    M += 0.5;
    evidence.M.push("TypeScript config");
  }
  if (s.hasEslint) M += 0.4;
  if (s.hasPrettier) M += 0.25;
  if (s.hasEditorconfig) M += 0.3;
  if (s.hasGitignore) M += 0.4;
  if (s.multiApp) M += 0.5;
  if (s.srcIndex) M += 0.3;
  if (s.hasContributing) M += 0.3;
  if (s.hasCodeOfConduct) M += 0.2;
  if (hasSecrets) M -= 1.2;
  if (s.archived) M -= 0.5;
  if (s.fork) M = Math.min(M, 5.0);
  M = clamp(M);

  let R = 4.5;
  if (s.hasTests) {
    R += 2.2;
    evidence.R.push("Tests detected in repo tree");
  }
  if (s.manyTests) {
    R += 1.2;
    evidence.R.push("Substantial test suite");
  }
  if (s.hasWorkflows) {
    R += 1.8;
    evidence.R.push("GitHub Actions CI workflow");
  } else if (s.hasOtherCI) {
    R += 1.0;
    evidence.R.push("CI config present");
  } else if (s.hasTests) {
    evidence.R.push("Tests but no CI pipeline");
  }
  if (s.hasDockerfile) R += 0.5;
  if (s.hasMakefile) R += 0.4;
  if (s.hasLockfile) R += 0.5;
  if (s.hasTsconfig) R += 0.3;
  if (s.archived) R -= 1.0;
  if (s.fork) R = Math.min(R, 5.0);
  R = clamp(R);

  const I = clamp(
    Math.log1p(s.stars) / 1.6 + Math.log1p(s.forks) / 3.2,
  );
  if (s.stars > 0) evidence.I.push(`${s.stars} stars, ${s.forks} forks`);
  else evidence.I.push("No stars yet");

  let C = 2.5 + Math.max(0, 1 - s.pushedDaysAgo / 400) * 3.5 + Math.min(Math.log10(1 + s.sizeKB) * 1.1, 2.5);
  if (s.pushedDaysAgo <= 60) evidence.C.push("Pushed within last 60 days");
  if (s.pushedDaysAgo > 366) evidence.C.push("Inactive over a year");
  if (s.archived) C = Math.min(C, 4);
  if (s.fork) C = Math.min(C, 3.5);
  C = clamp(C);

  let A = 4.0;
  if (s.multiApp) {
    A += 2.5;
    evidence.U.push("Multi-module / services layout");
  }
  if (s.srcIndex) {
    A += 1.2;
    evidence.U.push("Clean src/ organization");
  }
  if (s.complexDirs) {
    A += 1.0;
    evidence.U.push("Layered directory structure");
  }
  if (s.hasTsconfig) A += 0.6;
  if (s.hasEslint) A += 0.4;
  if (s.archived) A -= 0.8;
  if (s.fork) A = Math.min(A, 5.0);
  if (s.fileCount <= 4 && !s.srcIndex && !s.multiApp) A = Math.min(A, 3.0);
  A = clamp(A);

  let Cx = 3.0 + crossDomainBoost(s);
  const multi = s.languages.filter((l) => l.proportion >= 0.08).length;
  const extra = Math.max(0, multi - 1);
  Cx += Math.min(extra, 4) * 1.1;
  if (s.languages.length >= 3) {
    Cx += 1.2;
    evidence.U.push(`Polyglot: ${s.languages.map((l) => l.name).slice(0, 5).join(", ")}`);
  }
  if (crossDomainBoost(s) > 0) evidence.U.push("Cross-domain scope from description");
  if (s.multiApp) Cx += 0.5;
  if (s.fork) Cx = Math.min(Cx, 5.0);
  Cx = clamp(Cx);

  let In = 3.5;
  if (s.complexDirs) In += 1.2;
  if (s.hasTests || s.hasWorkflows) In += 0.8;
  if (s.descriptionLen > 40) {
    In += 0.8;
    evidence.U.push("Ambitious description");
  }
  if (s.languages.length >= 3) In += 0.8;
  if (s.multiApp) In += 0.5;
  if (s.archived) In -= 0.5;
  if (s.fork) In = Math.min(In, 4.5);
  if (s.fileCount <= 4 && !s.srcIndex && !s.multiApp) In = Math.min(In, 3.0);
  In = clamp(In);

  let D = 3.0;
  if (rb <= 0) evidence.U.push("No documentation");
  else if (rb <= 400) D += 2.5;
  else if (rb <= 1500) D += 4.5;
  else if (rb <= 4000) D += 6.0;
  else if (rb <= 9000) D += 7.5;
  else D += 8.5;
  let docsCulture = 0;
  if (s.hasLicense) docsCulture += 0.8;
  if (s.hasContributing) docsCulture += 0.7;
  if (s.hasCodeOfConduct) docsCulture += 0.7;
  if (s.hasSecurityMd) docsCulture += 0.7;
  D += Math.min(docsCulture, 1.8);
  if (s.fork) D = Math.min(D, 6.0);
  D = clamp(D);

  const U = to100((A + Cx + In + D) / 4);

  return {
    S: to100(S),
    M: to100(M),
    R: to100(R),
    I: to100(I),
    C: to100(C),
    U,
    A: to100(A),
    Cx: to100(Cx),
    In: to100(In),
    D: to100(D),
    evidence,
  };
}

export interface CurismRepoScore {
  name: string;
  language: string | null;
  stars: number;
  forks: number;
  archived: boolean;
  fork: boolean;
  isAnalyzed: boolean;
  sizeKB: number;
  scores: { S: number; M: number; R: number; I: number; C: number; U: number };
  acid: { A: number; Cx: number; In: number; D: number };
  evidence: Record<CurismKey, string[]>;
  overall: number;
  grade: string;
}

export function scoreRepo(name: string, signals: RepoSignals): CurismRepoScore {
  const c = computeSix(signals);
  const hard = (c.S + c.M + c.R) / 3;
  const soft = (c.I + c.C) / 2;
  const overall = round1(0.3 * hard + 0.4 * soft + 0.3 * c.U);
  return {
    name,
    language: signals.language,
    stars: signals.stars,
    forks: signals.forks,
    archived: signals.archived,
    fork: signals.fork,
    isAnalyzed: signals.isAnalyzed,
    sizeKB: signals.sizeKB,
    scores: { S: c.S, M: c.M, R: c.R, I: c.I, C: c.C, U: c.U },
    acid: { A: c.A, Cx: c.Cx, In: c.In, D: c.D },
    evidence: c.evidence,
    overall,
    grade: gradeFor(overall),
  };
}

export interface ProfileOverview {
  S: number;
  M: number;
  R: number;
  I: number;
  C: number;
  U: number;
  overall: number;
  grade: string;
  hard: number;
  soft: number;
  builder: number;
}

export interface ProfileCurism {
  user: string;
  overview: ProfileOverview;
  repos: CurismRepoScore[];
  analyzedCount: number;
  totalCount: number;
  scannedAt: string;
}

export function aggregateProfile(user: string, repos: CurismRepoScore[], scannedAt: string): ProfileCurism {
  const weight = (r: CurismRepoScore) => Math.pow(1 + Math.min(r.stars, 10000) / 100, 0.5);
  const totalW = repos.reduce((a, r) => a + weight(r), 0) || 1;
  const mean = (k: CurismKey) =>
    round1(repos.reduce((a, r) => a + r.scores[k] * weight(r), 0) / totalW);
  const S = mean("S");
  const M = mean("M");
  const R = mean("R");
  const I = mean("I");
  const C = mean("C");
  const U = mean("U");
  const hard = round1((S + M + R) / 3);
  const soft = round1((I + C) / 2);
  const overall = round1(0.3 * hard + 0.4 * soft + 0.3 * U);
  return {
    user,
    overview: { S, M, R, I, C, U, overall, grade: gradeFor(overall), hard, soft, builder: U },
    repos,
    analyzedCount: repos.filter((r) => r.isAnalyzed).length,
    totalCount: repos.length,
    scannedAt,
  };
}

export const CURISM_LABELS: Record<CurismKey, string> = {
  S: "Security",
  M: "Maintainability",
  R: "Reliability",
  I: "Influence",
  C: "Contribution",
  U: "Uniqueness",
};

export const CURISM_ORDER: CurismKey[] = ["C", "U", "R", "I", "S", "M"];

export function gradeColor(grade: string): string {
  switch (grade) {
    case "S+":
      return "text-white border-white/60 bg-white/10";
    case "S":
      return "text-green-300 border-green-400/60 bg-green-400/10";
    case "A":
      return "text-green-400 border-green-500/50 bg-green-500/10";
    case "B":
      return "text-green-500 border-green-600/40 bg-green-600/10";
    default:
      return "text-slate-400 border-slate-500/50 bg-slate-500/10";
  }
}
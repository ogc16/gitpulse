import { describe, expect, it } from "vitest";
import { computeSix, defaultSignals, scoreRepo, aggregateProfile, type RepoSignals } from "../lib/curism";

const signals = (over: Partial<RepoSignals> = {}): RepoSignals => ({
  ...defaultSignals({
    stars: 0,
    forks: 0,
    sizeKB: 200,
    pushedDaysAgo: 0,
    archived: false,
    fork: false,
    language: "TypeScript",
    description: "A GitHub profile scanner with CURISM scoring",
    isAnalyzed: true,
  }),
  ...over,
});

const README = "x".repeat(7000);

const healthyRepo = signals({
  fileCount: 40,
  dirCount: 6,
  hasReadme: true,
  readmeBytes: README.length,
  hasLicense: true,
  hasSecurityMd: true,
  hasContributing: true,
  hasCodeOfConduct: true,
  hasGitignore: true,
  hasEditorconfig: true,
  hasEslint: true,
  hasTsconfig: true,
  hasLockfile: true,
  hasWorkflows: true,
  hasDockerfile: true,
  hasTests: true,
  manyTests: true,
  srcIndex: true,
  languages: [
    { name: "TypeScript", proportion: 0.8 },
    { name: "CSS", proportion: 0.15 },
    { name: "JavaScript", proportion: 0.05 },
  ],
  descriptionLen: 50,
  stars: 120,
  forks: 30,
});

const bareRepo = signals({
  fileCount: 3,
  readmeBytes: 0,
  languages: [{ name: "TypeScript", proportion: 1 }],
  pushedDaysAgo: 900,
  archived: true,
  fork: true,
});

describe("computeSix — healthy analyzed repo", () => {
  const c = computeSix(healthyRepo);

  it("rewards lockfile + gitignore + security.md", () => {
    expect(c.S).toBeGreaterThanOrEqual(88);
    expect(c.evidence.S).toContain("SECURITY.md present");
    expect(c.evidence.S).toContain("Lockfile pins dependency versions");
    expect(c.evidence.S).toContain(".gitignore present");
  });

  it("scores maintainability near the top", () => {
    expect(c.M).toBeGreaterThanOrEqual(90);
    expect(c.evidence.M).toContain("Thorough README/docs");
    expect(c.evidence.M).toContain("License file");
    expect(c.evidence.M).toContain("TypeScript config");
  });

  it("gains full marks for tests, CI and Docker", () => {
    expect(c.R).toBe(100);
    expect(c.evidence.R).toContain("Tests detected in repo tree");
    expect(c.evidence.R).toContain("Substantial test suite");
    expect(c.evidence.R).toContain("GitHub Actions CI workflow");
  });

  it("computes influence from stars and forks", () => {
    const expected = Math.round((Math.log1p(120) / 1.6 + Math.log1p(30) / 3.2) * 10);
    expect(c.I).toBe(expected);
    expect(c.evidence.I[0]).toContain("120 stars");
  });

  it("caps contribution at recent activity", () => {
    expect(c.C).toBeGreaterThanOrEqual(80);
    expect(c.evidence.C).toContain("Pushed within last 60 days");
  });

  it("maxes documentation D for large README + docs culture", () => {
    expect(c.D).toBe(100);
    expect(c.evidence.U).toContain("Polyglot: TypeScript, CSS, JavaScript");
  });
});

describe("computeSix — bare metadata-only repo", () => {
  const c = computeSix(bareRepo);

  it("flags missing README and gitignore", () => {
    expect(c.evidence.M).toContain("No README found");
    expect(c.evidence.S).toContain("Missing .gitignore");
    expect(c.evidence.S).toContain("No lockfile for primary runtime");
  });

  it("keeps I at zero without stars or forks", () => {
    expect(c.I).toBe(0);
    expect(c.evidence.I[0]).toBe("No stars yet");
  });

  it("reports long inactivity", () => {
    expect(c.evidence.C).toContain("Inactive over a year");
    expect(c.evidence.C).not.toContain("Pushed within last 60 days");
  });

  it("scores far below the healthy repo overall", () => {
    const healthy = scoreRepo("healthy", healthyRepo);
    const weak = scoreRepo("bare", bareRepo);
    expect(weak.overall).toBeLessThan(healthy.overall);
  });
});

describe("scoreRepo", () => {
  it("applies the published CURISM weighting formula", () => {
    const r = scoreRepo("gitpulse", healthyRepo);
    const hard = (r.scores.S + r.scores.M + r.scores.R) / 3;
    const soft = (r.scores.I + r.scores.C) / 2;
    const expected = Math.round((0.3 * hard + 0.4 * soft + 0.3 * r.scores.U) * 10) / 10;
    expect(r.overall).toBe(expected);
    expect(["S+", "S", "A", "B", "C"]).toContain(r.grade);
  });

  it("carries identity fields through", () => {
    const r = scoreRepo("my-repo", healthyRepo);
    expect(r.name).toBe("my-repo");
    expect(r.language).toBe("TypeScript");
    expect(r.isAnalyzed).toBe(true);
    expect(r.sizeKB).toBe(200);
  });
});

describe("aggregateProfile", () => {
  it("weight-averages repos by star count and is consistent with the overview formula", () => {
    const big = scoreRepo("popular", healthyRepo);
    const small = scoreRepo("tiny", bareRepo);
    const p = aggregateProfile("ogc16", [big, small], "2026-09-23T00:00:00.000Z");

    expect(p.user).toBe("ogc16");
    expect(p.totalCount).toBe(2);
    expect(p.analyzedCount).toBe(2);
    expect(p.repos).toHaveLength(2);

    const hard = Math.round(((p.overview.S + p.overview.M + p.overview.R) / 3) * 10) / 10;
    expect(p.overview.hard).toBe(hard);
    const expected = Math.round((0.3 * hard + 0.4 * p.overview.soft + 0.3 * p.overview.U) * 10) / 10;
    expect(p.overview.overall).toBe(expected);
    expect(["S+", "S", "A", "B", "C"]).toContain(p.overview.grade);
  });

  it("counts only analyzed repos", () => {
    const notAnalyzed = scoreRepo("meta", { ...bareRepo, isAnalyzed: false });
    const p = aggregateProfile("ogc16", [notAnalyzed], "2026-09-23T00:00:00.000Z");
    expect(p.totalCount).toBe(1);
    expect(p.analyzedCount).toBe(0);
  });
});
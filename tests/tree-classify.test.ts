import { describe, expect, it } from "vitest";
import { classifyPaths, languagesFromPaths } from "../lib/tree-classify";

const FULL_TREE = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  ".gitignore",
  ".editorconfig",
  ".npmrc",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "eslint.config.mjs",
  "postcss.config.mjs",
  ".github/workflows/ci.yml",
  "Dockerfile",
  "app/page.tsx",
  "app/globals.css",
  "components/Header.tsx",
  "lib/curism.ts",
  "lib/github.ts",
  "public/favicon.ico",
  "tests/curism.test.ts",
  "tests/grade.test.ts",
  "tests/clamp.test.ts",
  "tests/jobs.test.ts",
  "tests/tree-classify.test.ts",
  ".env.local",
];

describe("classifyPaths — full project tree", () => {
  const s = classifyPaths(FULL_TREE);

  it("counts files and top-level directories", () => {
    expect(s.fileCount).toBe(FULL_TREE.length);
    expect(s.dirCount).toBe(6);
    expect(s.complexDirs).toBe(false);
  });

  it("detects community docs", () => {
    expect(s.hasReadme).toBe(true);
    expect(s.readmePath).toBe("README.md");
    expect(s.hasLicense).toBe(true);
    expect(s.hasSecurityMd).toBe(true);
    expect(s.hasContributing).toBe(true);
    expect(s.hasCodeOfConduct).toBe(true);
  });

  it("detects tooling and hygiene files", () => {
    expect(s.hasGitignore).toBe(true);
    expect(s.hasEditorconfig).toBe(true);
    expect(s.hasEslint).toBe(true);
    expect(s.hasTsconfig).toBe(true);
    expect(s.hasLockfile).toBe(true);
    expect(s.hasWorkflows).toBe(true);
    expect(s.hasDockerfile).toBe(true);
    expect(s.hasPrettier).toBe(false);
    expect(s.hasMakefile).toBe(false);
    expect(s.hasOtherCI).toBe(false);
  });

  it("detects a substantial test suite (5+ matches)", () => {
    expect(s.hasTests).toBe(true);
    expect(s.manyTests).toBe(true);
  });

  it("does not flag a root-level .env.local (lib only flags nested/key-shaped paths)", () => {
    expect(s.secretFiles).toHaveLength(0);
  });

  it("flags nested .env and key files as suspicious secrets", () => {
    const s = classifyPaths(["config/.env.production", "server.pem", "id_rsa"]);
    expect(s.secretFiles).toEqual(["config/.env.production", "server.pem", "id_rsa"]);
  });

  it("recognizes lib/ as a src-index layout", () => {
    expect(s.srcIndex).toBe(true);
    expect(s.multiApp).toBe(false);
  });
});

describe("classifyPaths — minimal tree", () => {
  const s = classifyPaths(["index.html", "app.js"]);

  it("stays sparse with no docs or tests", () => {
    expect(s.fileCount).toBe(2);
    expect(s.hasReadme).toBe(false);
    expect(s.hasLicense).toBe(false);
    expect(s.hasTests).toBe(false);
    expect(s.manyTests).toBe(false);
    expect(s.hasLockfile).toBe(false);
    expect(s.complexDirs).toBe(false);
    expect(s.secretFiles).toHaveLength(0);
  });
});

describe("classifyPaths — secret detection scope", () => {
  it("ignores nested env files that look like templates", () => {
    const s = classifyPaths(["config/.env.example", "docs/README.md"]);
    expect(s.secretFiles).toHaveLength(0);
  });

  it("catches private key files", () => {
    const s = classifyPaths(["server.pem", "id_rsa"]);
    expect(s.secretFiles).toEqual(expect.arrayContaining(["server.pem", "id_rsa"]));
  });
});

describe("languagesFromPaths", () => {
  const sizes: Record<string, number> = {
    "lib/curism.ts": 8000,
    "app/page.tsx": 5000,
    "app/globals.css": 4000,
    "README.md": 6500,
    "images/logo.png": 9000,
  };

  it("tallies only recognized source extensions, largest first", () => {
    const langs = languagesFromPaths(Object.keys(sizes), (p) => sizes[p]);
    expect(langs.map((l) => l.name)).toEqual(["TypeScript", "CSS"]);
    expect(langs[0].bytes).toBe(13000);
    expect(langs[1].bytes).toBe(4000);
  });

  it("returns an empty list when nothing matches", () => {
    expect(languagesFromPaths(["README.md", "Makefile"], () => 100)).toEqual([]);
  });
});
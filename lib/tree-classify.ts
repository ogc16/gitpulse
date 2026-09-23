export interface PathSignals {
  fileCount: number;
  dirCount: number;
  complexDirs: boolean;
  multiApp: boolean;
  srcIndex: boolean;
  hasReadme: boolean;
  readmePath: string | null;
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
}

export const README_RE = /(^|\/)readme(\.[a-z0-9]+)?$/i;
const LICENSE_RE = /(^|\/)(license|copying|unlicense)(\.[a-z0-9]+)?$/i;
const SECURITY_RE = /(^|\/)security\.md$/i;
const CONTRIBUTING_RE = /(^|\/)contributing(\.[a-z0-9]+)?$/i;
const COC_RE = /(^|\/)code[_-]?of[_-]?conduct(\.[a-z0-9]+)?$/i;
const GITIGNORE_RE = /(^|\/)\.gitignore$/;
const EDITORCONFIG_RE = /(^|\/)\.editorconfig$/;
const PRETTIER_RE = /(^|\/)(\.prettier(r|c|ignore)?([.-]?[a-z0-9]+)?|prettier\.config\.(js|cjs|mjs|ts))$/i;
const ESLINT_RE = /(^|\/)(\.eslintrc([.-]?[a-z0-9]+)?|eslint\.config\.(js|cjs|mjs|ts))$/i;
const TSCONFIG_RE = /(^|\/)tsconfig\.json$/;
const LOCKFILES_RE = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)bun\.lockb?$/,
  /(^|\/)cargo\.lock$/,
  /(^|\/)go\.sum$/,
  /(^|\/)gem\.lock$/,
  /(^|\/)poetry\.lock$/,
  /(^|\/)composer\.lock$/,
  /(^|\/)uv\.lock$/,
  /(^|\/)pdm\.lock$/,
];
const WORKFLOW_RE = /(^|\/)\.github\/workflows\/.+\.(ya?ml)$/i;
const OTHER_CI_RE = /(^|\/)(\.gitlab-ci\.yml|Jenkinsfile|\.circleci\/|azure-pipelines\.yml|\.buildkite\/|\.travis\.yml)/i;
const DOCKER_RE = /(^|\/)dockerfile($|\.)/i;
const MAKEFILE_RE = /(^|\/)Makefile$/;
const TEST_RE = /(__tests__\/|\/?(test|tests|spec|assert)\/|\.(test|spec)\.[a-z0-9]+$|_test\.(go|py|rs)$|\.tests\.py$|\.bats$)/i;
const SECRET_ENV_RE = /(^|\/)\.env(\.[a-z0-9_]+)?$/;
const ENV_TEMPLATE_RE = /(example|sample|\.local\.dist|template|template\.dist)/i;
const KEYFILE_RE = /(^|\/)[^/]+\.(pem|key|p12|pfx|keystore|jks|ppk)$/i;
const KEYNAME_RE = /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)$/;
const MULTIAPP_DIRS = ["packages", "apps", "services", "platform", "server", "backend", "frontend", "web", "mobile", "microservices", "modules", "clients"];

export function classifyPaths(paths: string[]): PathSignals {
  const entries = paths;
  const fileCount = entries.length;
  const topDirs = new Set<string>();
  for (const p of entries) {
    const seg = p.split("/");
    if (seg.length > 1) topDirs.add(seg[0].toLowerCase());
  }
  const dirCount = topDirs.size;
  const multiApp = [...topDirs].some((d) => MULTIAPP_DIRS.includes(d));

  const readmePath = entries.find((p) => README_RE.test(p)) ?? null;
  const hasReadme = readmePath !== null;

  const hasWorkflows = entries.some((p) => WORKFLOW_RE.test(p));
  const hasOtherCI = entries.some((p) => OTHER_CI_RE.test(p));
  const testHits = entries.filter((p) => TEST_RE.test(p)).length;

  const secretFiles = entries
    .filter((p) => {
      const envOnly = SECRET_ENV_RE.test(p) && p.split("/").length === 2 && !ENV_TEMPLATE_RE.test(p);
      return (envOnly || KEYFILE_RE.test(p) || KEYNAME_RE.test(p)) && p.split("/").length <= 2;
    })
    .slice(0, 20);

  return {
    fileCount,
    dirCount,
    complexDirs: dirCount >= 8,
    multiApp,
    srcIndex: entries.some((p) => /^(src|lib|core|internal)\//.test(p)),
    hasReadme,
    readmePath,
    hasLicense: entries.some((p) => LICENSE_RE.test(p)),
    hasSecurityMd: entries.some((p) => SECURITY_RE.test(p)),
    hasContributing: entries.some((p) => CONTRIBUTING_RE.test(p)),
    hasCodeOfConduct: entries.some((p) => COC_RE.test(p)),
    hasGitignore: entries.some((p) => GITIGNORE_RE.test(p)),
    hasEditorconfig: entries.some((p) => EDITORCONFIG_RE.test(p)),
    hasPrettier: entries.some((p) => PRETTIER_RE.test(p)),
    hasEslint: entries.some((p) => ESLINT_RE.test(p)),
    hasTsconfig: entries.some((p) => TSCONFIG_RE.test(p)),
    hasLockfile: LOCKFILES_RE.some((re) => entries.some((p) => re.test(p))),
    hasWorkflows,
    hasOtherCI,
    hasDockerfile: entries.some((p) => DOCKER_RE.test(p)),
    hasMakefile: entries.some((p) => MAKEFILE_RE.test(p)),
    hasTests: testHits > 0,
    manyTests: testHits >= 5,
    secretFiles,
  };
}

const EXT_LANGS: Record<string, string> = {
  ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript", ".jsx": "JavaScript",
  ".py": "Python", ".go": "Go", ".rs": "Rust", ".java": "Java", ".kt": "Kotlin", ".kts": "Kotlin",
  ".c": "C", ".h": "C", ".cpp": "C++", ".cc": "C++", ".cxx": "C++", ".hpp": "C++",
  ".cs": "C#", ".php": "PHP", ".rb": "Ruby", ".swift": "Swift", ".dart": "Dart",
  ".html": "HTML", ".htm": "HTML", ".css": "CSS", ".scss": "SCSS", ".sass": "SCSS",
  ".sh": "Shell", ".bash": "Shell", ".zsh": "Shell", ".ps1": "PowerShell", ".sql": "SQL",
  ".lua": "Lua", ".r": "R", ".jl": "Julia", ".pl": "Perl", ".svelte": "Svelte",
  ".d": "D", ".zig": "Zig", ".ex": "Elixir", ".exs": "Elixir", ".erl": "Erlang", ".v": "V",
};

export function languagesFromPaths(paths: string[], sizeOf: (p: string) => number): { name: string; bytes: number }[] {
  const tally: Record<string, number> = {};
  for (const p of paths) {
    const dot = p.lastIndexOf(".");
    if (dot < 0) continue;
    const ext = p.slice(dot).toLowerCase();
    const lang = EXT_LANGS[ext];
    if (!lang) continue;
    tally[lang] = (tally[lang] || 0) + sizeOf(p);
  }
  return Object.entries(tally)
    .map(([name, bytes]) => ({ name, bytes }))
    .sort((a, b) => b.bytes - a.bytes);
}
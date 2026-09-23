#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const steps = ["lint", "typecheck", "test", "build"];

for (const step of steps) {
  console.log(`\n\x1b[2m\x1b[1m› npm run ${step}\x1b[0m`);
  const r = spawnSync("npm", ["run", step], { stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`\x1b[31m✗ ${step} failed\x1b[0m`);
    process.exit(r.status ?? 1);
  }
}
console.log("\n\x1b[32m✓ all checks passed\x1b[0m");
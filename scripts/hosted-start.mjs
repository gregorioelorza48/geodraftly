#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function run(command, args, { optional = false } = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env, shell: false });
  if (result.status !== 0 && !optional) {
    process.exit(result.status ?? 1);
  }
  if (result.status !== 0) {
    console.warn(`${command} ${args.join(" ")} failed; continuing so the web service can start.`);
  }
}

run("node", ["scripts/prepare-postgres.mjs"]);
run("npx", ["tsx", "prisma/seed.ts"], { optional: true });
run("npx", ["next", "start"]);

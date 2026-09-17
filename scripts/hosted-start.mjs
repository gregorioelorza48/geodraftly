#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const env = { ...process.env, CI: "true" };

function run(command, args, { optional = false, timeoutMs } = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    shell: false,
    timeout: timeoutMs,
    killSignal: "SIGKILL",
  });
  if (result.error?.code === "ETIMEDOUT") {
    console.warn(`${command} ${args.join(" ")} timed out after ${timeoutMs}ms; continuing so the web service can start.`);
    if (!optional) process.exit(1);
    return;
  }
  if (result.status !== 0 && !optional) {
    process.exit(result.status ?? 1);
  }
  if (result.status !== 0) {
    console.warn(`${command} ${args.join(" ")} failed; continuing so the web service can start.`);
  }
}

// Schema push must not block binding to PORT (Render fails the deploy after 15 minutes).
run("node", ["scripts/prepare-postgres.mjs"], { optional: true, timeoutMs: 90_000 });
if (process.env.SEED_ON_START === "1") {
  run("npx", ["tsx", "prisma/seed.ts"], { optional: true, timeoutMs: 45_000 });
} else {
  console.log("Skipping seed at start. Set SEED_ON_START=1 to run it.");
}
run("npx", ["next", "start", "-H", "0.0.0.0"]);

#!/usr/bin/env node
import { execSync } from "node:child_process";

// schema.prisma is SQLite in git. A Postgres DATABASE_URL here would fail generate.
execSync("npx prisma generate", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: "file:./dev.db" },
});

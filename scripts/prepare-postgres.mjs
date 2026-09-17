#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function fromPieces() {
  const host = process.env.PGHOST?.trim();
  const user = process.env.PGUSER?.trim();
  const password = process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD ?? "";
  const port = process.env.PGPORT?.trim() || "5432";
  const database = process.env.PGDATABASE?.trim() || "railway";
  if (!host || !user) return "";
  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
  return `postgresql://${auth}@${host}:${port}/${database}`;
}

function withSsl(url) {
  if (!/^postgres(ql)?:/i.test(url) || /[?&]sslmode=/i.test(url)) return url;
  return url.includes("?") ? `${url}&sslmode=require` : `${url}?sslmode=require`;
}

const databaseUrl = withSsl(
  [
    process.env.DATABASE_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.POSTGRES_URL,
    fromPieces(),
  ]
    .map((value) => value?.trim() ?? "")
    .find(Boolean) ?? "",
);

if (!databaseUrl || !/^postgres(ql)?:/i.test(databaseUrl)) {
  console.warn("No Postgres DATABASE_URL; skipping schema push.");
  process.exit(0);
}

process.env.DATABASE_URL = databaseUrl;

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");
const next = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
const env = { ...process.env, CI: "true" };

if (next !== schema) {
  fs.writeFileSync(schemaPath, next);
  console.log("Prisma provider set to postgresql.");
  execSync("npx prisma generate", { stdio: "inherit", env });
}

// CI=true keeps db push non-interactive. Generate already ran at build time.
execSync("npx prisma db push --skip-generate", { stdio: "inherit", env });

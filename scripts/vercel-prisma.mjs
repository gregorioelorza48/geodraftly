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

const resolvedUrl = [
  process.env.DATABASE_URL,
  process.env.DATABASE_PRIVATE_URL,
  process.env.DATABASE_PUBLIC_URL,
  process.env.POSTGRES_URL,
  fromPieces(),
]
  .map((value) => value?.trim() ?? "")
  .find(Boolean);

if (resolvedUrl && !process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = resolvedUrl;
}

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const onHosted = Boolean(process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT);
const isPostgres = /^(postgres(ql)?|prisma\+postgres)/i.test(databaseUrl);
const isSqliteFile = databaseUrl.startsWith("file:");

if (onHosted && (!databaseUrl || isSqliteFile)) {
  console.error(`
Geodraftly needs Postgres in production (SQLite is local-only).

Add a Postgres database on Railway or Vercel, set:

  DATABASE_URL   postgresql://...   (not file:./dev.db)
  SESSION_SECRET a long random string

Then redeploy.
`);
  process.exit(1);
}

if (!databaseUrl) {
  console.warn("DATABASE_URL is not set; Prisma generate may fail.");
}

if (isPostgres) {
  const schema = fs.readFileSync(schemaPath, "utf8");
  const next = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  if (next === schema) {
    console.log("Prisma schema already uses postgresql.");
  } else {
    fs.writeFileSync(schemaPath, next);
    console.log("Prisma provider set to postgresql for this build.");
  }
}

execSync("npx prisma generate", { stdio: "inherit" });

if (isPostgres) {
  execSync("npx prisma db push", { stdio: "inherit" });
}

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

if (resolvedUrl) process.env.DATABASE_URL = resolvedUrl;

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const onHosted = Boolean(
  process.env.VERCEL ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID,
);
const isPostgres = /^(postgres(ql)?|prisma\+postgres)/i.test(databaseUrl);
const generateUrl =
  isPostgres || onHosted ? databaseUrl || "postgresql://postgres:postgres@127.0.0.1:5432/railway" : databaseUrl || "file:./dev.db";

if (onHosted || isPostgres) {
  const schema = fs.readFileSync(schemaPath, "utf8");
  const next = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  if (next !== schema) {
    fs.writeFileSync(schemaPath, next);
    console.log("Prisma provider set to postgresql for this build.");
  }
}

execSync("npx prisma generate", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: generateUrl },
});

if (isPostgres) {
  execSync("npx prisma db push", { stdio: "inherit" });
} else if (onHosted) {
  console.warn("DATABASE_URL is not available at build time. Tables will be created on pre-deploy / first start.");
}

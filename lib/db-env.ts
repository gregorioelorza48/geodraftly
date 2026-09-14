/**
 * Railway puts DATABASE_URL on the Postgres box. The website only sees it
 * after a Variable Reference, or via PGHOST/PGUSER/… if those were shared.
 * Prisma reads process.env.DATABASE_URL when the client is created.
 */
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

export function getDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    fromPieces(),
  ];
  return candidates.map((value) => value?.trim() ?? "").find(Boolean) ?? "";
}

export function applyDatabaseUrl() {
  const url = getDatabaseUrl();
  if (url && !process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = url;
  }
  return url;
}

applyDatabaseUrl();

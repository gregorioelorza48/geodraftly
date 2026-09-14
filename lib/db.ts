import { applyDatabaseUrl, getDatabaseUrl } from "./db-env";
import { PrismaClient } from "@prisma/client";

applyDatabaseUrl();

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing on this server. On Railway, click the website box (geodraftly), not Postgres → Variables → New Variable. Name: DATABASE_URL. Value: ${{Postgres.DATABASE_URL}} (use the exact name of your database box if it is not Postgres). Save, then Redeploy.",
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

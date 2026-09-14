import { applyDatabaseUrl, getDatabaseUrl } from "./db-env";
import { PrismaClient } from "@prisma/client";

applyDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is missing on this server. On Railway, click the website box (geodraftly), not Postgres → Variables → New Variable. Name: DATABASE_URL. Value: ${{Postgres.DATABASE_URL}} (use the exact name of your database box if it is not Postgres). Save, then Redeploy.",
    );
  }
  globalForPrisma.prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  return globalForPrisma.prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = client[prop as keyof PrismaClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

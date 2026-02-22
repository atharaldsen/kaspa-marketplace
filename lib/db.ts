import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildClient() {
  // Resolve relative DATABASE_URL to absolute so it works regardless of
  // which working directory the process was launched from.
  // Avoids importing 'path' (not available in edge runtime).
  const dbUrl = process.env.DATABASE_URL;
  if (typeof process !== "undefined" && process.cwd && dbUrl?.startsWith("file:./")) {
    const relative = dbUrl.slice("file:./".length);
    const cwd = process.cwd();
    const absolute = cwd.endsWith("/") ? cwd + relative : cwd + "/" + relative;
    return new PrismaClient({
      datasources: { db: { url: `file:${absolute}` } },
    });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || buildClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

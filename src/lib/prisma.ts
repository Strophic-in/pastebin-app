import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// DATABASE_URL is the pooled (PgBouncer) connection string. Serverless functions each get their
// own small pool; PgBouncer shares the server connections between them.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 3,
});

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

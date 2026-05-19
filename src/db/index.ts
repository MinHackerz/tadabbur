import { PrismaClient } from '.prisma/client/default';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prisma v7 uses the Wasm "client" engine which requires a driver adapter.
// @prisma/adapter-pg wraps a pg.Pool and is the official PostgreSQL adapter.
const globalForPrisma = globalThis as unknown as {
  prisma_v2: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Fallback to a dummy URL during build so Next.js static analysis doesn't crash.
  let connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';
  connectionString = connectionString.replace('sslmode=require', 'sslmode=require&uselibpqcompat=true');

  // Enhanced pool configuration for serverless databases (Neon, Vercel Postgres, etc.)
  // These settings help prevent P1001 connection timeout errors during cold starts
  const pool = new Pool({
    connectionString,
    // Connection pool settings optimized for serverless
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 30000, // Wait up to 30 seconds for connection
    // Allow graceful handling of connection errors
    allowExitOnIdle: true,
  });

  // Handle pool errors gracefully
  pool.on('error', (err) => {
    console.error('Unexpected pool error:', err);
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma_v2 ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma_v2 = prisma;

export default prisma;

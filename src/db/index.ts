import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// We use a fallback so the app builds even if DATABASE_URL is not set yet.
// However, any actual DB queries will fail until a valid connection string is provided.
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/quran_insight';

const sql = neon(connectionString);
export const db = drizzle(sql);

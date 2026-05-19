import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Load .env.local (same file Next.js uses)
config({ path: '.env.local' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});

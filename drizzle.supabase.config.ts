import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

expand(config({ path: '.env.local' }));

export default defineConfig({
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_DATABASE_URL!,
  },
});

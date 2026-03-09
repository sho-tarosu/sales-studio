import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

// drizzle-kit は .env.local を自動で読まないため明示的に読み込む
expand(config({ path: '.env.local' }));

export default defineConfig({
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/travelmind'
const isNeon = /neon\.tech/i.test(url)

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url,
    // Neon pooled URLs hang without SSL; drizzle-kit passes this to `pg`.
    ssl: isNeon ? { rejectUnauthorized: false } : undefined,
  },
})

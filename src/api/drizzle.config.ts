import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL?.trim()
if (!url) {
  throw new Error(
    'DATABASE_URL is missing. Copy src/api/.env.example to src/api/.env and paste your Neon connection string.',
  )
}

const looksLikePlaceholder =
  /USER:PASSWORD@HOST/i.test(url) ||
  /localhost:5432\/travelmind/i.test(url) ||
  /:pass@/i.test(url)

if (looksLikePlaceholder) {
  throw new Error(
    'DATABASE_URL still looks like a placeholder. Open src/api/.env and paste the real connection string from the Neon dashboard (Connection details → connection string).',
  )
}

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

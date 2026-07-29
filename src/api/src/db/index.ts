import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required')
}

const isNeon = /neon\.tech/i.test(connectionString)
const pool = new Pool({
  connectionString,
  // Neon requires TLS; local Postgres typically does not.
  ssl: isNeon ? { rejectUnauthorized: false } : undefined,
})

export const db = drizzle(pool, { schema })
export type Db = typeof db

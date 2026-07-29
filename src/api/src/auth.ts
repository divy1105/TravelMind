import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
import { profile, schema } from './db/schema'
import { resolveAuthSecret } from './auth-secret'
import { randomUUID } from 'crypto'

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000'
const port = process.env.PORT ? Number(process.env.PORT) : 3001
const baseURL = process.env.BETTER_AUTH_URL || `http://localhost:${port}`

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  secret: resolveAuthSecret(),
  baseURL,
  trustedOrigins: [clientOrigin],
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await db.insert(profile).values({
            id: randomUUID(),
            userId: createdUser.id,
          })
        },
      },
    },
  },
})

export type AuthSession = typeof auth.$Infer.Session

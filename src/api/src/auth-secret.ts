import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const SECRET_FILE = join(process.cwd(), '.auth-secret')

/**
 * Resolve Better Auth secret: env BETTER_AUTH_SECRET, else gitignored .auth-secret,
 * else generate and persist for local use (not a vendor API key).
 */
export function resolveAuthSecret(): string {
  const fromEnv = process.env.BETTER_AUTH_SECRET?.trim()
  if (fromEnv) return fromEnv

  if (existsSync(SECRET_FILE)) {
    const fromFile = readFileSync(SECRET_FILE, 'utf8').trim()
    if (fromFile) return fromFile
  }

  const generated = randomBytes(32).toString('hex')
  writeFileSync(SECRET_FILE, generated, 'utf8')
  // eslint-disable-next-line no-console
  console.log(`[TravelMind] Wrote Better Auth secret to ${SECRET_FILE}`)
  return generated
}

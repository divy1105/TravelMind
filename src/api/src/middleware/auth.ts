import type { NextFunction, Request, Response } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../auth'

export type AuthUser = {
  id: string
  name: string
  email: string
  image?: string | null
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser
    }
  }
}

/** Require a valid Better Auth session cookie; attaches `req.authUser`. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    })
    if (!session?.user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    req.authUser = session.user as AuthUser
    next()
  } catch (err) {
    console.error('[requireAuth]', err)
    res.status(401).json({ error: 'Unauthorized' })
  }
}

export function getAuthUserId(req: Request): string | undefined {
  return req.authUser?.id
}

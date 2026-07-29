import { clerkMiddleware, getAuth, requireAuth } from '@clerk/express'
import type { Request, Response, NextFunction } from 'express'

export { requireAuth, getAuth }

export const clerkAuth = clerkMiddleware()

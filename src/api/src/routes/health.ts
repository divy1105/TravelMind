import { sql } from 'drizzle-orm'
import { Router } from 'express'
import { db } from '../db'

export function healthRouter() {
  const router = Router()

  router.get('/health', async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1`)
      res.status(200).json({ ok: true })
    } catch {
      res.status(500).json({ ok: false })
    }
  })

  return router
}

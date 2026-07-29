import { type PrismaClient } from '@prisma/client'
import { Router } from 'express'

export function healthRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/health', async (_req, res) => {
    try {
      // Minimal DB ping. This does not rely on domain models.
      await prisma.$queryRaw`SELECT 1`
      res.status(200).json({ ok: true })
    } catch (err) {
      res.status(500).json({ ok: false })
    }
  })

  return router
}


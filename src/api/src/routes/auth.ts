import { Router } from 'express'
import type { PrismaClient } from '@prisma/client'
import { requireAuth, getAuth } from '../middleware/auth'

export function authRouter(prisma: PrismaClient) {
  const router = Router()

  router.post('/api/auth/sync', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { email, name, avatarUrl } = req.body as {
        email: string
        name?: string
        avatarUrl?: string
      }

      if (!email) {
        res.status(400).json({ error: 'Email is required' })
        return
      }

      const user = await prisma.user.upsert({
        where: { externalId: userId },
        update: { email, name, avatarUrl },
        create: { externalId: userId, email, name, avatarUrl },
        include: { profile: true },
      })

      if (!user.profile) {
        await prisma.profile.create({ data: { userId: user.id } })
      }

      const result = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true },
      })

      res.json({ user: result })
    } catch (err) {
      console.error('[auth/sync]', err)
      res.status(500).json({ error: 'Sync failed' })
    }
  })

  return router
}

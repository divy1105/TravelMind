import { Router } from 'express'
import type { PrismaClient } from '@prisma/client'
import { requireAuth, getAuth } from '../middleware/auth'

export function usersRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/api/users/me', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await prisma.user.findUnique({
        where: { externalId: userId },
        include: { profile: true },
      })

      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      res.json({ user })
    } catch (err) {
      console.error('[users/me GET]', err)
      res.status(500).json({ error: 'Failed to fetch user' })
    }
  })

  router.patch('/api/users/me', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await prisma.user.findUnique({
        where: { externalId: userId },
      })

      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const { bio, travelStyle, preferredCurrency, homeCity, name } = req.body as {
        bio?: string
        travelStyle?: string
        preferredCurrency?: string
        homeCity?: string
        name?: string
      }

      if (name !== undefined) {
        await prisma.user.update({
          where: { id: user.id },
          data: { name },
        })
      }

      const profile = await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          ...(bio !== undefined && { bio }),
          ...(travelStyle !== undefined && { travelStyle }),
          ...(preferredCurrency !== undefined && { preferredCurrency }),
          ...(homeCity !== undefined && { homeCity }),
        },
        create: {
          userId: user.id,
          bio,
          travelStyle,
          preferredCurrency,
          homeCity,
        },
      })

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true },
      })

      res.json({ user: updated })
    } catch (err) {
      console.error('[users/me PATCH]', err)
      res.status(500).json({ error: 'Failed to update profile' })
    }
  })

  return router
}

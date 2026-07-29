import { eq } from 'drizzle-orm'
import { Router } from 'express'
import { db } from '../db'
import { profile, user } from '../db/schema'
import { requireAuth, getAuthUserId } from '../middleware/auth'
import { randomUUID } from 'crypto'

export function usersRouter() {
  const router = Router()

  router.get('/api/users/me', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const row = await db.query.user.findFirst({
        where: eq(user.id, userId),
        with: { profile: true },
      })

      if (!row) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      res.json({
        user: {
          id: row.id,
          email: row.email,
          name: row.name,
          avatarUrl: row.image,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          profile: row.profile,
        },
      })
    } catch (err) {
      console.error('[users/me GET]', err)
      res.status(500).json({ error: 'Failed to fetch user' })
    }
  })

  router.patch('/api/users/me', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const existing = await db.query.user.findFirst({
        where: eq(user.id, userId),
      })
      if (!existing) {
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
        await db.update(user).set({ name }).where(eq(user.id, userId))
      }

      const existingProfile = await db.query.profile.findFirst({
        where: eq(profile.userId, userId),
      })

      if (existingProfile) {
        await db
          .update(profile)
          .set({
            ...(bio !== undefined && { bio }),
            ...(travelStyle !== undefined && { travelStyle }),
            ...(preferredCurrency !== undefined && { preferredCurrency }),
            ...(homeCity !== undefined && { homeCity }),
          })
          .where(eq(profile.userId, userId))
      } else {
        await db.insert(profile).values({
          id: randomUUID(),
          userId,
          bio,
          travelStyle,
          preferredCurrency,
          homeCity,
        })
      }

      const updated = await db.query.user.findFirst({
        where: eq(user.id, userId),
        with: { profile: true },
      })

      res.json({
        user: {
          id: updated!.id,
          email: updated!.email,
          name: updated!.name,
          avatarUrl: updated!.image,
          createdAt: updated!.createdAt,
          updatedAt: updated!.updatedAt,
          profile: updated!.profile,
        },
      })
    } catch (err) {
      console.error('[users/me PATCH]', err)
      res.status(500).json({ error: 'Failed to update profile' })
    }
  })

  return router
}

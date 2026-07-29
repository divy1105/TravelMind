import cors from 'cors'
import express, { type Express } from 'express'
import { prisma } from './prisma'
import { healthRouter } from './routes/health'
import { authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { clerkAuth } from './middleware/auth'
import { errorHandler } from './middleware/errorHandler'

export async function createServer(): Promise<Express> {
  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use(clerkAuth)

  app.use(healthRouter(prisma))
  app.use(authRouter(prisma))
  app.use(usersRouter(prisma))

  app.get('/ping', (_req, res) => {
    res.json({ ok: true })
  })

  app.use(errorHandler)
  return app
}

import cors from 'cors'
import express, { type Express } from 'express'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth'
import { healthRouter } from './routes/health'
import { usersRouter } from './routes/users'
import { tripsRouter } from './routes/trips'
import { errorHandler } from './middleware/errorHandler'

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000'

export async function createServer(): Promise<Express> {
  const app = express()

  app.use(
    cors({
      origin: clientOrigin,
      credentials: true,
    }),
  )

  // Better Auth must be mounted before express.json()
  app.all('/api/auth/*', toNodeHandler(auth))

  app.use(express.json())

  app.use(healthRouter())
  app.use(usersRouter())
  app.use(tripsRouter())

  app.get('/ping', (_req, res) => {
    res.json({ ok: true })
  })

  app.use(errorHandler)
  return app
}

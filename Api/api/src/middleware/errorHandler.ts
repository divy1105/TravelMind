import type { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[TravelMind] API error', err)
  res.status(500).json({ error: 'Internal Server Error' })
}


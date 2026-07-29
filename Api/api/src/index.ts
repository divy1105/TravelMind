import 'dotenv/config'
import { createServer } from './server'

const port = process.env.PORT ? Number(process.env.PORT) : 3001

createServer()
  .then((app) => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`[TravelMind] API listening on http://localhost:${port}`)
    })
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[TravelMind] Failed to start API', err)
    process.exit(1)
  })


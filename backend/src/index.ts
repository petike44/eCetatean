import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { corsMiddleware } from './middleware/cors'
import { claudiaRoute } from './routes/claudia'
import { pdfRoute } from './routes/pdf'
import { reportsRoute } from './routes/reports'
import { auditRoute } from './routes/audit'
import { civilServantRoute } from './routes/civil-servant'
import { healthRoute } from './routes/health'
import { lifeEventsRoute } from './routes/life-events'
import { profileRoute } from './routes/profile'

const app = new Hono()

// —— Global Middleware ——————————————————————————————————————————
app.use('*', logger())
app.use('*', corsMiddleware)

// —— Routes ————————————————————————————————————————————————————
app.route('/api/claudia', claudiaRoute)
app.route('/api/pdf', pdfRoute)
app.route('/api/reports', reportsRoute)
app.route('/api/audit', auditRoute)
app.route('/api/civil-servant', civilServantRoute)
app.route('/api/health', healthRoute)
app.route('/api/life-events', lifeEventsRoute)
app.route('/api/profile', profileRoute)

// —— Root ——————————————————————————————————————————————————————
app.get('/', (c) =>
  c.json({
    app: 'eCetățean API',
    version: '1.0.0',
    status: 'running',
    note: 'ClaudIA AI integration must be added manually',
  })
)

// —— 404 ———————————————————————————————————————————————————————
app.notFound((c) =>
  c.json({ success: false, error: 'Endpoint negăsit' }, 404)
)

// —— Global Error Handler ——————————————————————————————————————
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ success: false, error: 'Eroare internă de server' }, 500)
})

// —— Local dev server ——————————————————————————————————————————
// Only listen when running under Node directly (not on Vercel).
// Vercel uses `export default app` below and does not execute this branch.
if (process.env.VERCEL !== '1') {
  const port = Number(process.env.PORT ?? 3001)
  import('@hono/node-server')
    .then(({ serve }) => {
      serve({ fetch: app.fetch, port })
      console.log(`eCetățean API listening on http://localhost:${port}`)
    })
    .catch((err) => {
      console.error('Failed to start node-server:', err)
    })
}

export default app

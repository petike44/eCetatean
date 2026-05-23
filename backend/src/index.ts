import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({
  app: 'eCetățean API',
  version: '1.0.0',
  status: 'initializing',
}))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

export default app

import { FastifyInstance } from 'fastify'
import db from '../db/init'

async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', async () => {
    // Simple DB check; throws if connection is broken
    db.prepare('SELECT 1').get()

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  })
}

export default healthRoutes

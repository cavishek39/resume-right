import { FastifyInstance } from 'fastify'
import { createOneClickUser } from '../services/authService'

interface OneClickBody {
  displayName?: string
}

async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: OneClickBody }>('/oneclick', async (request, reply) => {
    try {
      const { displayName } = request.body || {}
      const { userId, token } = createOneClickUser(displayName)

      return {
        success: true,
        userId,
        token,
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: (error as Error).message })
    }
  })
}

export default authRoutes

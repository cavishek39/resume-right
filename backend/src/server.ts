import fastify from 'fastify'
import multipart from '@fastify/multipart'
import cors from '@fastify/cors'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

import resumeRoutes from './routes/resume'
import jobRoutes from './routes/job'
import analyzeRoutes from './routes/analyze'
import authRoutes from './routes/auth'
import healthRoutes from './routes/health'

dotenv.config()

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default

// Initialize Fastify
const app = fastify({
  logger: true,
  bodyLimit: MAX_FILE_SIZE,
})

// Register plugins
app.register(cors, { origin: true })
app.register(multipart, {
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
})

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Register routes
app.register(resumeRoutes, { prefix: '/api/resume' })
app.register(jobRoutes, { prefix: '/api/job' })
app.register(analyzeRoutes, { prefix: '/api/analyze' })
app.register(authRoutes, { prefix: '/api/auth' })
app.register(healthRoutes, { prefix: '/api/health' })

// Ensure required directories exist
const ensureDirectories = () => {
  const dirs = [
    process.env.STORAGE_PATH || './uploads',
    path.dirname(process.env.DATABASE_PATH || './data/resume-right.db'),
  ]

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

// Start server
const start = async (): Promise<void> => {
  try {
    ensureDirectories()

    const port = parseInt(process.env.PORT || '3000')
    const host = process.env.HOST || '0.0.0.0'

    await app.listen({ port, host })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

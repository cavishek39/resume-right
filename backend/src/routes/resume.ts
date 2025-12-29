import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import path from 'path'
import fs from 'fs/promises'
import { parseResume } from '../services/resumeParser'
import db from '../db/init'
import { getUserByToken } from '../services/authService'

const authenticate = (
  request: FastifyRequest,
  reply: FastifyReply
): { id: number } | null => {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Authorization token required' })
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  const user = getUserByToken(token)

  if (!user) {
    reply.code(401).send({ error: 'Invalid or expired token' })
    return null
  }

  return { id: user.id }
}

async function resumeRoutes(fastify: FastifyInstance): Promise<void> {
  // Upload and parse resume
  fastify.post('/upload', async (request, reply) => {
    try {
      const user = authenticate(request, reply)
      if (!user) return

      const data = await request.file()

      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' })
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]
      if (!allowedTypes.includes(data.mimetype)) {
        return reply
          .code(400)
          .send({ error: 'Only PDF and DOCX files are allowed' })
      }

      // Save file
      const storagePath = process.env.STORAGE_PATH || './uploads'
      const filename = `${Date.now()}-${data.filename}`
      const filePath = path.join(storagePath, filename)

      await fs.writeFile(filePath, await data.toBuffer())

      // Parse resume
      const parsedData = await parseResume(filePath, data.mimetype)

      fastify.log.info(
        {
          filename: data.filename,
          mimetype: data.mimetype,
          rawLength: parsedData.rawText.length,
          rawPreview: parsedData.rawText.slice(0, 200),
          emails: parsedData.contact.emails,
          phones: parsedData.contact.phones,
          skillsPreview: parsedData.skills.slice(0, 120),
        },
        'parsed resume summary'
      )

      // Store in database
      const stmt = db.prepare(`
        INSERT INTO resumes (user_id, filename, original_path, parsed_data)
        VALUES (?, ?, ?, ?)
      `)

      const result = stmt.run(
        user.id,
        data.filename,
        filePath,
        JSON.stringify(parsedData)
      )

      return {
        success: true,
        resumeId: result.lastInsertRowid,
        filename: data.filename,
        parsedData,
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: (error as Error).message })
    }
  })

  // Get parsed resume by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const user = authenticate(request, reply)
      if (!user) return

      const { id } = request.params

      const stmt = db.prepare('SELECT * FROM resumes WHERE id = ?')
      const resume = stmt.get(id) as any

      if (!resume) {
        return reply.code(404).send({ error: 'Resume not found' })
      }

      if (resume.user_id !== user.id) {
        return reply.code(403).send({ error: 'Not authorized to access' })
      }

      return {
        id: resume.id,
        filename: resume.filename,
        parsedData: JSON.parse(resume.parsed_data),
        createdAt: resume.created_at,
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: (error as Error).message })
    }
  })
}

export default resumeRoutes

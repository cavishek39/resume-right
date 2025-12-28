import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import path from 'path'
import fs from 'fs/promises'
import { parseResume } from '../services/resumeParser'
import db from '../db/init'

async function resumeRoutes(fastify: FastifyInstance): Promise<void> {
  // Upload and parse resume
  fastify.post('/upload', async (request, reply) => {
    try {
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
        INSERT INTO resumes (filename, original_path, parsed_data)
        VALUES (?, ?, ?)
      `)

      const result = stmt.run(
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
      const { id } = request.params

      const stmt = db.prepare('SELECT * FROM resumes WHERE id = ?')
      const resume = stmt.get(id) as any

      if (!resume) {
        return reply.code(404).send({ error: 'Resume not found' })
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

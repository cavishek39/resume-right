import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { scrapeJobDescription } from '../services/jobScraper'
import { extractSkillsAndRequirements } from '../services/skillExtractor'
import db from '../db/init'
import { getUserByToken } from '../services/authService'

interface JobSubmitBody {
  jobUrl?: string
  jobText?: string
}

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

async function jobRoutes(fastify: FastifyInstance): Promise<void> {
  // Submit job description (text or URL)
  fastify.post<{ Body: JobSubmitBody }>('/submit', async (request, reply) => {
    try {
      const user = authenticate(request, reply)
      if (!user) return

      const { jobUrl, jobText } = request.body

      if (!jobUrl && !jobText) {
        return reply
          .code(400)
          .send({ error: 'Either jobUrl or jobText is required' })
      }

      let rawText: string
      let sourceUrl: string | null = null

      // Fetch from URL if provided
      if (jobUrl) {
        sourceUrl = jobUrl
        rawText = await scrapeJobDescription(jobUrl)
        fastify.log.info(
          { jobUrl, rawLength: rawText.length },
          'scraped job description'
        )
      } else {
        rawText = jobText || ''
      }

      // Extract skills and requirements
      const extracted = await extractSkillsAndRequirements(rawText)
      fastify.log.info(
        {
          jobUrl: sourceUrl,
          skills: extracted.skills,
          requirementsCount: extracted.requirements.length,
          yearsExperience: extracted.yearsExperience,
        },
        'extracted job requirements and skills'
      )

      // Store in database
      const stmt = db.prepare(`
        INSERT INTO job_descriptions (user_id, source_url, raw_text, extracted_skills, requirements)
        VALUES (?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        user.id,
        sourceUrl,
        rawText,
        JSON.stringify(extracted.skills),
        JSON.stringify(extracted.requirements)
      )

      return {
        success: true,
        jobId: result.lastInsertRowid,
        extracted,
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: (error as Error).message })
    }
  })

  // Get job description by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const user = authenticate(request, reply)
      if (!user) return

      const { id } = request.params

      const stmt = db.prepare('SELECT * FROM job_descriptions WHERE id = ?')
      const job = stmt.get(id) as any

      if (!job) {
        return reply.code(404).send({ error: 'Job description not found' })
      }

      if (job.user_id !== user.id) {
        return reply.code(403).send({ error: 'Not authorized to access' })
      }

      return {
        id: job.id,
        sourceUrl: job.source_url,
        rawText: job.raw_text,
        skills: JSON.parse(job.extracted_skills),
        requirements: JSON.parse(job.requirements),
        createdAt: job.created_at,
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: (error as Error).message })
    }
  })
}

export default jobRoutes

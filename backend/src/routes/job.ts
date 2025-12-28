import { FastifyInstance } from 'fastify'
import { scrapeJobDescription } from '../services/jobScraper'
import { extractSkillsAndRequirements } from '../services/skillExtractor'
import db from '../db/init'

interface JobSubmitBody {
  jobUrl?: string
  jobText?: string
}

async function jobRoutes(fastify: FastifyInstance): Promise<void> {
  // Submit job description (text or URL)
  fastify.post<{ Body: JobSubmitBody }>('/submit', async (request, reply) => {
    try {
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
        INSERT INTO job_descriptions (source_url, raw_text, extracted_skills, requirements)
        VALUES (?, ?, ?, ?)
      `)

      const result = stmt.run(
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
      const { id } = request.params

      const stmt = db.prepare('SELECT * FROM job_descriptions WHERE id = ?')
      const job = stmt.get(id) as any

      if (!job) {
        return reply.code(404).send({ error: 'Job description not found' })
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

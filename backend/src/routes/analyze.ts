import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { compareResumeToJob } from '../services/resumeComparer'
import { rewriteResumeWithAI } from '../services/openRouterService'
import db from '../db/init'
import { getUserByToken, verifyClerkToken } from '../services/authService'

interface CompareBody {
  resumeId: number
  jobId: number
}

interface RewriteBody {
  analysisId: number
}

const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ id: number } | null> => {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Authorization token required' })
    return null
  }

  const token = authHeader.replace('Bearer ', '')

  const clerkUser = await verifyClerkToken(token)
  if (clerkUser) return { id: clerkUser.userId }

  const user = getUserByToken(token)
  if (user) return { id: user.id }

  reply.code(401).send({ error: 'Invalid or expired token' })
  return null
}

async function analyzeRoutes(fastify: FastifyInstance): Promise<void> {
  // Compare resume against job and store analysis
  fastify.post<{ Body: CompareBody }>('/compare', async (request, reply) => {
    try {
      const user = await authenticate(request, reply)
      if (!user) return

      const { resumeId, jobId } = request.body

      if (!resumeId || !jobId) {
        return reply
          .code(400)
          .send({ error: 'Both resumeId and jobId are required' })
      }

      // Fetch resume
      const resumeStmt = db.prepare('SELECT * FROM resumes WHERE id = ?')
      const resume = resumeStmt.get(resumeId) as any

      if (!resume) {
        return reply.code(404).send({ error: 'Resume not found' })
      }

      if (resume.user_id !== user.id) {
        return reply
          .code(403)
          .send({ error: 'Not authorized to access resume' })
      }

      // Fetch job
      const jobStmt = db.prepare('SELECT * FROM job_descriptions WHERE id = ?')
      const job = jobStmt.get(jobId) as any

      if (!job) {
        return reply.code(404).send({ error: 'Job description not found' })
      }

      if (job.user_id !== user.id) {
        return reply.code(403).send({ error: 'Not authorized to access job' })
      }

      // Parse stored data
      const resumeData = JSON.parse(resume.parsed_data)
      const jobSkills = JSON.parse(job.extracted_skills)
      const jobRequirements = JSON.parse(job.requirements)

      // Perform comparison
      const comparison = await compareResumeToJob(resumeData, {
        skills: jobSkills,
        requirements: jobRequirements,
        yearsExperience: null, // Can be extracted from job text if needed
      })

      // Store analysis result
      const insertStmt = db.prepare(`
        INSERT INTO analysis_results (user_id, resume_id, job_id, comparison_data, suggestions, match_percentage, missing_skills_summary, missing_requirements_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = insertStmt.run(
        user.id,
        resumeId,
        jobId,
        JSON.stringify(comparison),
        JSON.stringify(comparison.suggestions),
        comparison.matchPercentage,
        JSON.stringify(comparison.missingSkills.slice(0, 5)),
        JSON.stringify(comparison.missingRequirements.slice(0, 5))
      )

      return {
        success: true,
        analysisId: result.lastInsertRowid,
        comparison,
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: (error as Error).message })
    }
  })

  // Rewrite resume using AI
  fastify.post<{ Body: RewriteBody }>('/rewrite', async (request, reply) => {
    try {
      const user = await authenticate(request, reply)
      if (!user) return

      const { analysisId } = request.body

      if (!analysisId) {
        return reply.code(400).send({ error: 'analysisId is required' })
      }

      // Fetch analysis
      const analysisStmt = db.prepare(
        'SELECT * FROM analysis_results WHERE id = ?'
      )
      const analysis = analysisStmt.get(analysisId) as any

      if (!analysis) {
        return reply.code(404).send({ error: 'Analysis not found' })
      }

      if (analysis.user_id !== user.id) {
        return reply
          .code(403)
          .send({ error: 'Not authorized to access analysis' })
      }

      // Fetch resume
      const resumeStmt = db.prepare('SELECT * FROM resumes WHERE id = ?')
      const resume = resumeStmt.get(analysis.resume_id) as any

      if (!resume || resume.user_id !== user.id) {
        return reply
          .code(403)
          .send({ error: 'Not authorized to access resume' })
      }

      // Fetch job
      const jobStmt = db.prepare('SELECT * FROM job_descriptions WHERE id = ?')
      const job = jobStmt.get(analysis.job_id) as any

      if (!job || job.user_id !== user.id) {
        return reply.code(403).send({ error: 'Not authorized to access job' })
      }

      const resumeData = JSON.parse(resume.parsed_data)
      const comparison = JSON.parse(analysis.comparison_data)

      // Generate rewritten resume with AI
      const rewrittenResume = await rewriteResumeWithAI({
        resumeText: resumeData.rawText,
        jobDescription: job.raw_text,
        missingSkills: comparison.missingSkills,
        missingRequirements: comparison.missingRequirements,
        suggestions: comparison.suggestions,
      })

      // Update analysis with rewritten resume
      const updateStmt = db.prepare(
        'UPDATE analysis_results SET rewritten_resume = ? WHERE id = ?'
      )
      updateStmt.run(rewrittenResume, analysisId)

      return {
        success: true,
        analysisId,
        rewrittenResume,
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: (error as Error).message })
    }
  })

  // Get analysis result by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const user = await authenticate(request, reply)
      if (!user) return

      const { id } = request.params

      const stmt = db.prepare('SELECT * FROM analysis_results WHERE id = ?')
      const analysis = stmt.get(id) as any

      if (!analysis) {
        return reply.code(404).send({ error: 'Analysis not found' })
      }

      if (analysis.user_id !== user.id) {
        return reply
          .code(403)
          .send({ error: 'Not authorized to access analysis' })
      }

      return {
        id: analysis.id,
        resumeId: analysis.resume_id,
        jobId: analysis.job_id,
        comparison: JSON.parse(analysis.comparison_data),
        suggestions: JSON.parse(analysis.suggestions),
        rewrittenResume: analysis.rewritten_resume,
        createdAt: analysis.created_at,
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: (error as Error).message })
    }
  })

  // Full analysis: Compare + Rewrite in one call
  fastify.post<{ Body: CompareBody & { rewrite?: boolean } }>(
    '/full',
    async (request, reply) => {
      try {
        const user = await authenticate(request, reply)
        if (!user) return

        const { resumeId, jobId, rewrite = true } = request.body

        if (!resumeId || !jobId) {
          return reply
            .code(400)
            .send({ error: 'Both resumeId and jobId are required' })
        }

        // Fetch resume
        const resumeStmt = db.prepare('SELECT * FROM resumes WHERE id = ?')
        const resume = resumeStmt.get(resumeId) as any

        if (!resume) {
          return reply.code(404).send({ error: 'Resume not found' })
        }

        if (resume.user_id !== user.id) {
          return reply
            .code(403)
            .send({ error: 'Not authorized to access resume' })
        }

        // Fetch job
        const jobStmt = db.prepare(
          'SELECT * FROM job_descriptions WHERE id = ?'
        )
        const job = jobStmt.get(jobId) as any

        if (!job) {
          return reply.code(404).send({ error: 'Job description not found' })
        }

        if (job.user_id !== user.id) {
          return reply.code(403).send({ error: 'Not authorized to access job' })
        }

        // Parse stored data
        const resumeData = JSON.parse(resume.parsed_data)
        const jobSkills = JSON.parse(job.extracted_skills)
        const jobRequirements = JSON.parse(job.requirements)

        // Perform comparison
        const comparison = await compareResumeToJob(resumeData, {
          skills: jobSkills,
          requirements: jobRequirements,
          yearsExperience: null,
        })

        let rewrittenResume = null

        // Generate AI rewrite if requested
        if (rewrite) {
          rewrittenResume = await rewriteResumeWithAI({
            resumeText: resumeData.rawText,
            jobDescription: job.raw_text,
            missingSkills: comparison.missingSkills,
            missingRequirements: comparison.missingRequirements,
            suggestions: comparison.suggestions,
          })
        }

        // Store analysis result with rewritten resume
        const insertStmt = db.prepare(`
        INSERT INTO analysis_results (user_id, resume_id, job_id, comparison_data, suggestions, rewritten_resume, match_percentage, missing_skills_summary, missing_requirements_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

        const result = insertStmt.run(
          user.id,
          resumeId,
          jobId,
          JSON.stringify(comparison),
          JSON.stringify(comparison.suggestions),
          rewrittenResume,
          comparison.matchPercentage,
          JSON.stringify(comparison.missingSkills.slice(0, 5)),
          JSON.stringify(comparison.missingRequirements.slice(0, 5))
        )

        return {
          success: true,
          analysisId: result.lastInsertRowid,
          comparison,
          rewrittenResume,
        }
      } catch (error) {
        fastify.log.error(error)
        return reply.code(500).send({ error: (error as Error).message })
      }
    }
  )

  // Recent analyses list for current user
  fastify.get('/recent', async (request, reply) => {
    try {
      const user = await authenticate(request, reply)
      if (!user) return

      const stmt = db.prepare(`
          SELECT ar.id, ar.job_id, ar.resume_id, ar.match_percentage, ar.missing_skills_summary, ar.missing_requirements_summary, ar.created_at,
                 jd.job_title, jd.company, jd.source_url
          FROM analysis_results ar
          JOIN job_descriptions jd ON jd.id = ar.job_id
          WHERE ar.user_id = ?
          ORDER BY ar.created_at DESC
          LIMIT 20
        `)

      const rows = stmt.all(user.id) as Array<{
        id: number
        job_id: number
        resume_id: number
        match_percentage: number | null
        missing_skills_summary: string | null
        missing_requirements_summary: string | null
        created_at: string
        job_title: string | null
        company: string | null
        source_url: string | null
      }>

      const items = rows.map((row) => ({
        analysisId: row.id,
        jobId: row.job_id,
        resumeId: row.resume_id,
        matchPercentage: row.match_percentage ?? null,
        missingSkills: row.missing_skills_summary
          ? (JSON.parse(row.missing_skills_summary) as string[])
          : [],
        missingRequirements: row.missing_requirements_summary
          ? (JSON.parse(row.missing_requirements_summary) as string[])
          : [],
        jobTitle: row.job_title,
        company: row.company,
        sourceUrl: row.source_url,
        createdAt: row.created_at,
      }))

      return { success: true, items }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: (error as Error).message })
    }
  })
}

export default analyzeRoutes

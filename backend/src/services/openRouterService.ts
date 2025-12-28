import dotenv from 'dotenv'

// Ensure .env is loaded even if the caller hasn't configured it yet
dotenv.config()

const OPENROUTER_API_URL =
  process.env.OPENROUTER_API_URL ||
  'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-5.1'

const getAuthHeaders = () => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  }

  if (process.env.OPENROUTER_REFERER) {
    headers['HTTP-Referer'] = process.env.OPENROUTER_REFERER
  }

  if (process.env.OPENROUTER_TITLE) {
    headers['X-Title'] = process.env.OPENROUTER_TITLE
  }

  return headers
}

interface ResumeRewriteParams {
  resumeText: string
  jobDescription: string
  missingSkills: string[]
  missingRequirements: string[]
  suggestions: string[]
}

interface ResumeEntitiesResult {
  skills: string[]
  emails: string[]
  phones: string[]
  roles: string[]
}

/**
 * Rewrite resume using Gemini AI to optimize for job description
 */
export async function rewriteResumeWithAI(
  params: ResumeRewriteParams
): Promise<string> {
  const {
    resumeText,
    jobDescription,
    missingSkills,
    missingRequirements,
    suggestions,
  } = params

  const prompt = buildRewritePrompt({
    resumeText,
    jobDescription,
    missingSkills,
    missingRequirements,
    suggestions,
  })

  const completion = await callOpenRouter(prompt)

  if (!completion || completion.trim().length < 50) {
    throw new Error(
      `Generated resume is too short or empty (length=${
        completion?.trim().length || 0
      })`
    )
  }

  return completion.trim()
}

/**
 * Generate quick resume improvement suggestions using AI
 */
export async function generateQuickSuggestions(
  resumeText: string,
  jobDescription: string
): Promise<string[]> {
  const prompt = buildSuggestionsPrompt(resumeText, jobDescription)

  const text = await callOpenRouter(prompt)

  const suggestions = text
    .split('\n')
    .filter((line) => line.trim().match(/^[-*•\d.]/))
    .map((line) => line.replace(/^[-*•\d.]\s*/, '').trim())
    .filter((line) => line.length > 10)
    .slice(0, 5)

  return suggestions
}

export async function extractResumeEntities(
  resumeText: string
): Promise<ResumeEntitiesResult> {
  const prompt = `Extract structured resume entities. Return strict JSON only.

Resume:
${resumeText.substring(0, 5000)}

Return JSON with keys: skills (array of strings), emails (array), phones (array), roles (array). Use lowercase for skills, strip duplicates.`

  const text = await callOpenRouter(prompt, {
    maxTokens: 600,
    temperature: 0.1,
  })

  try {
    const parsed = JSON.parse(text)

    const uniq = (arr: any[]) =>
      Array.from(new Set((arr || []).filter((v) => typeof v === 'string')))

    return {
      skills: uniq(parsed.skills || []),
      emails: uniq(parsed.emails || []),
      phones: uniq(parsed.phones || []),
      roles: uniq(parsed.roles || []),
    }
  } catch (err) {
    throw new Error(
      `Failed to parse LLM resume entities JSON: ${(err as Error).message}`
    )
  }
}

function buildRewritePrompt(params: {
  resumeText: string
  jobDescription: string
  missingSkills: string[]
  missingRequirements: string[]
  suggestions: string[]
}) {
  const {
    resumeText,
    jobDescription,
    missingSkills,
    missingRequirements,
    suggestions,
  } = params

  return `You are an expert resume writer and ATS optimization specialist. Your task is to rewrite a resume to better match a specific job description while maintaining authenticity and truthfulness.

# ORIGINAL RESUME:
${resumeText}

# TARGET JOB DESCRIPTION:
${jobDescription}

# ANALYSIS & GAPS:
Missing Skills: ${missingSkills.join(', ') || 'None'}
Missing Requirements: ${missingRequirements.slice(0, 3).join('; ') || 'None'}

# OPTIMIZATION SUGGESTIONS:
${suggestions.join('\n')}

# INSTRUCTIONS:
1. **Maintain Truthfulness**: Only rewrite based on existing experience in the resume. DO NOT fabricate skills or experience.
2. **Keyword Optimization**: Integrate missing skills naturally where they relate to existing experience.
3. **ATS-Friendly**: Use exact keywords from the job description in bullet points.
4. **Quantify Achievements**: Add or emphasize metrics where possible (%, numbers, scale).
5. **Reorder Content**: Prioritize the most relevant experience and skills for this job.
6. **Professional Tone**: Keep it concise, action-oriented, and impactful.
7. **Format**: Return in clean Markdown format with proper sections (Summary, Experience, Skills, Education).

# SECTIONS TO OPTIMIZE:
- **Professional Summary**: 2-3 sentences highlighting most relevant experience for this role
- **Skills**: List technical skills matching job requirements first
- **Experience**: Rewrite bullet points to emphasize relevant achievements with metrics
- **Education**: Keep as-is unless highly relevant to job

# OUTPUT FORMAT:
Return ONLY the rewritten resume in Markdown format. Do not include explanations or meta-commentary.

---

REWRITTEN RESUME:`
}

function buildSuggestionsPrompt(resumeText: string, jobDescription: string) {
  return `Analyze this resume against the job description and provide 5 specific, actionable suggestions to improve the match.

Resume:
${resumeText.substring(0, 2000)}

Job Description:
${jobDescription.substring(0, 1500)}

Provide exactly 5 bullet points with specific, actionable improvements. Format as a simple list.`
}

async function callOpenRouter(
  prompt: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const headers = getAuthHeaders()

  const max_tokens = opts?.maxTokens ?? 1200
  const temperature = opts?.temperature ?? 0.3

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a concise, accurate assistant helping with resume optimization.',
        },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `OpenRouter request failed: ${response.status} ${errorText}`
    )
  }

  const data = (await response.json()) as any
  const content = data?.choices?.[0]?.message?.content

  let text: string | undefined

  if (typeof content === 'string') {
    text = content
  } else if (Array.isArray(content)) {
    // Some OpenRouter models return content as an array of parts
    text = content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part.text === 'string') return part.text
        return ''
      })
      .join('')
  }

  if (!text || text.trim().length === 0) {
    throw new Error('OpenRouter response missing content')
  }

  return text
}

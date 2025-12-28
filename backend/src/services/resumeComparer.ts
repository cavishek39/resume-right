interface ComparisonResult {
  matchPercentage: number
  matchedSkills: string[]
  missingSkills: string[]
  matchedRequirements: string[]
  missingRequirements: string[]
  suggestions: string[]
  strengths: string[]
  weaknesses: string[]
}

interface ResumeData {
  rawText: string
  contact: {
    emails: string[]
    phones: string[]
  }
  skills: string
  experience: string
  education: string
}

interface JobData {
  skills: string[]
  requirements: string[]
  yearsExperience: number | null
}

/**
 * Compare resume against job description and generate insights
 */
export async function compareResumeToJob(
  resume: ResumeData,
  job: JobData
): Promise<ComparisonResult> {
  const resumeText = resume.rawText.toLowerCase()
  const resumeSkills = resume.skills.toLowerCase()
  const resumeExperience = resume.experience.toLowerCase()

  // Match skills
  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  for (const skill of job.skills) {
    if (
      resumeText.includes(skill.toLowerCase()) ||
      resumeSkills.includes(skill.toLowerCase())
    ) {
      matchedSkills.push(skill)
    } else {
      missingSkills.push(skill)
    }
  }

  // Match requirements (fuzzy matching for common phrases)
  const matchedRequirements: string[] = []
  const missingRequirements: string[] = []

  for (const requirement of job.requirements) {
    const reqLower = requirement.toLowerCase()
    const keywords = extractKeywords(reqLower)

    // Check if at least 60% of keywords are in resume
    const matchedCount = keywords.filter((kw) => resumeText.includes(kw)).length
    const matchRatio = matchedCount / Math.max(keywords.length, 1)

    if (matchRatio >= 0.6) {
      matchedRequirements.push(requirement)
    } else {
      missingRequirements.push(requirement)
    }
  }

  // Calculate overall match percentage
  const totalItems =
    job.skills.length + job.requirements.length + (job.yearsExperience ? 1 : 0)
  const matchedItems =
    matchedSkills.length +
    matchedRequirements.length +
    (checkExperienceMatch(resumeExperience, job.yearsExperience) ? 1 : 0)

  const matchPercentage = Math.round((matchedItems / totalItems) * 100)

  // Generate suggestions
  const suggestions = generateSuggestions(
    missingSkills,
    missingRequirements,
    job.yearsExperience,
    resumeExperience
  )

  // Identify strengths and weaknesses
  const strengths = generateStrengths(matchedSkills, matchedRequirements)
  const weaknesses = generateWeaknesses(missingSkills, missingRequirements)

  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
    matchedRequirements,
    missingRequirements,
    suggestions,
    strengths,
    weaknesses,
  }
}

/**
 * Extract meaningful keywords from requirement text
 */
function extractKeywords(text: string): string[] {
  // Remove common stop words and short words
  const stopWords = [
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'have',
    'has',
    'had',
  ]

  return text
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.includes(word))
    .slice(0, 10) // Take top 10 keywords
}

/**
 * Check if resume experience matches job requirement
 */
function checkExperienceMatch(
  resumeExp: string,
  requiredYears: number | null
): boolean {
  if (!requiredYears) return true

  // Try to extract years from resume experience section
  const yearMatches = resumeExp.match(/(\d+)\+?\s*years?/gi)
  if (!yearMatches || yearMatches.length === 0) return false

  // Sum up all years mentioned
  let totalYears = 0
  for (const match of yearMatches) {
    const years = parseInt(match.match(/\d+/)?.[0] || '0')
    totalYears = Math.max(totalYears, years)
  }

  return totalYears >= requiredYears
}

/**
 * Generate actionable suggestions based on gaps
 */
function generateSuggestions(
  missingSkills: string[],
  missingRequirements: string[],
  requiredYears: number | null,
  resumeExp: string
): string[] {
  const suggestions: string[] = []

  // Skill-based suggestions
  if (missingSkills.length > 0) {
    const topMissing = missingSkills.slice(0, 3)
    suggestions.push(
      `Add these key skills to your resume: ${topMissing.join(', ')}`
    )

    if (missingSkills.length > 3) {
      suggestions.push(
        `Consider highlighting any experience with: ${missingSkills
          .slice(3, 6)
          .join(', ')}`
      )
    }
  }

  // Requirement-based suggestions
  if (missingRequirements.length > 0) {
    suggestions.push(
      `Emphasize experience related to: ${missingRequirements[0]}`
    )

    if (missingRequirements.length > 1) {
      suggestions.push(
        'Add specific examples or projects demonstrating these requirements'
      )
    }
  }

  // Experience-based suggestions
  if (requiredYears && !checkExperienceMatch(resumeExp, requiredYears)) {
    suggestions.push(
      `Highlight ${requiredYears}+ years of relevant experience prominently`
    )
  }

  // General ATS optimization
  if (missingSkills.length > 0 || missingRequirements.length > 0) {
    suggestions.push(
      'Use exact keywords from the job description to improve ATS match'
    )
    suggestions.push(
      'Quantify achievements with metrics (e.g., "increased performance by 40%")'
    )
  }

  return suggestions
}

/**
 * Generate strengths based on matches
 */
function generateStrengths(
  matchedSkills: string[],
  matchedRequirements: string[]
): string[] {
  const strengths: string[] = []

  if (matchedSkills.length > 0) {
    strengths.push(
      `Strong technical skill match: ${matchedSkills.slice(0, 5).join(', ')}`
    )
  }

  if (matchedRequirements.length > 0) {
    strengths.push(
      `Meets ${matchedRequirements.length} key requirement(s) from the job description`
    )
  }

  if (matchedSkills.length >= 5) {
    strengths.push('Comprehensive skill set aligned with job needs')
  }

  return strengths
}

/**
 * Generate weaknesses based on gaps
 */
function generateWeaknesses(
  missingSkills: string[],
  missingRequirements: string[]
): string[] {
  const weaknesses: string[] = []

  if (missingSkills.length > 3) {
    weaknesses.push(
      `Missing ${missingSkills.length} required skills - may reduce chances`
    )
  }

  if (missingRequirements.length > 2) {
    weaknesses.push('Several key requirements not clearly addressed in resume')
  }

  if (missingSkills.length === 0 && missingRequirements.length === 0) {
    weaknesses.push('Could add more specific examples to strengthen match')
  }

  return weaknesses
}

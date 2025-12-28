interface ExtractedData {
  skills: string[]
  requirements: string[]
  yearsExperience: number | null
}

/**
 * Extract skills and requirements from job description text
 * This is a rule-based approach to avoid LLM calls
 */
export async function extractSkillsAndRequirements(
  text: string
): Promise<ExtractedData> {
  const lowerText = text.toLowerCase()

  // Common technical skills dictionary
  const skillsDict = [
    // Programming Languages
    'javascript',
    'typescript',
    'python',
    'java',
    'c++',
    'c#',
    'ruby',
    'php',
    'go',
    'rust',
    'swift',
    'kotlin',
    // Frontend
    'react',
    'vue',
    'angular',
    'html',
    'css',
    'sass',
    'tailwind',
    'bootstrap',
    'webpack',
    'vite',
    // Backend
    'node.js',
    'express',
    'fastify',
    'django',
    'flask',
    'spring',
    'rails',
    '.net',
    // Databases
    'sql',
    'mysql',
    'postgresql',
    'mongodb',
    'redis',
    'elasticsearch',
    'sqlite',
    // Cloud/DevOps
    'aws',
    'azure',
    'gcp',
    'docker',
    'kubernetes',
    'jenkins',
    'github actions',
    'ci/cd',
    // Tools
    'git',
    'jira',
    'postman',
    'figma',
    'graphql',
    'rest api',
    'microservices',
  ]

  // Extract mentioned skills
  const foundSkills = skillsDict.filter((skill) => lowerText.includes(skill))

  // Extract requirements (look for common patterns)
  const requirements: string[] = []
  const lines = text.split('\n')

  const requirementKeywords = [
    'required',
    'must have',
    'responsibilities',
    'qualifications',
    'requirements',
  ]
  let inRequirementsSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lowerLine = line.toLowerCase()

    // Check if we're entering a requirements section
    if (requirementKeywords.some((kw) => lowerLine.includes(kw))) {
      inRequirementsSection = true
      continue
    }

    // Collect bullet points or numbered items in requirements section
    if (inRequirementsSection) {
      // Stop if we hit another major section
      if (/^(about|benefits|perks|salary)/i.test(lowerLine)) {
        break
      }

      // Extract bullet points or numbered items
      if (
        /^[•\-*\d+\.]\s+/.test(line) ||
        (line.length > 10 && line.length < 200)
      ) {
        requirements.push(line.replace(/^[•\-*\d+\.]\s+/, '').trim())
      }
    }
  }

  // Extract years of experience if mentioned
  const experienceMatch = text.match(/(\d+)\+?\s*years?\s*(of)?\s*experience/i)
  const yearsExperience = experienceMatch ? parseInt(experienceMatch[1]) : null

  return {
    skills: foundSkills,
    requirements: requirements.slice(0, 15), // Limit to top 15
    yearsExperience,
  }
}

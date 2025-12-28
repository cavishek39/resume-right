import mammoth from 'mammoth'
import fs from 'fs/promises'
import { PdfReader } from 'pdfreader'
import { extractResumeEntities } from './openRouterService'

interface ParsedResume {
  rawText: string
  contact: {
    emails: string[]
    phones: string[]
  }
  skills: string
  experience: string
  education: string
}

/**
 * Parse resume from PDF or DOCX file
 */
export async function parseResume(
  filePath: string,
  mimeType: string
): Promise<ParsedResume> {
  let text = ''

  if (mimeType === 'application/pdf') {
    const dataBuffer = await fs.readFile(filePath)
    text = await extractPdfText(dataBuffer)
  } else if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ path: filePath })
    text = result.value
  } else {
    throw new Error('Unsupported file type')
  }

  const normalizedText = normalizeText(text)

  // Basic structured extraction (enhance this later with better parsing)
  const structured = extractStructuredData(normalizedText)

  if (!structured.skills || structured.skills.trim().length === 0) {
    try {
      const llm = await extractResumeEntities(normalizedText)
      const mergedSkills = Array.from(
        new Set(
          [
            ...(structured.skills ? structured.skills.split(/[,\n]/) : []),
            ...llm.skills,
          ]
            .map((s) => s.trim())
            .filter(Boolean)
        )
      )
      structured.skills = mergedSkills.join(', ')

      if (structured.contact.emails.length === 0 && llm.emails.length > 0) {
        structured.contact.emails = llm.emails
      }
      if (structured.contact.phones.length === 0 && llm.phones.length > 0) {
        structured.contact.phones = llm.phones
      }
    } catch (err) {
      console.warn('LLM resume entity extraction failed', err)
    }
  }

  return {
    rawText: normalizedText,
    ...structured,
  }
}

/**
 * Extract structured data from resume text
 * This is a basic implementation - can be enhanced with better parsing logic
 */
function extractStructuredData(text: string) {
  // Simple extraction logic
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const phoneRegex = /(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g

  const emails: string[] = text.match(emailRegex) ?? []
  const phones: string[] = text.match(phoneRegex) ?? []

  // Extract sections (basic implementation)
  const skillsFromSection = extractSection(text, [
    'skills',
    'technical skills',
    'technologies',
  ])

  const skillsFromDictionary = detectSkills(text)

  const combinedSkills = Array.from(
    new Set(
      [...skillsFromSection.split(/[,\n]/), ...skillsFromDictionary]
        .map((s) => s.trim())
        .filter(Boolean)
    )
  ).join(', ')

  const sections = {
    contact: { emails, phones },
    skills: combinedSkills,
    experience: extractSection(text, [
      'experience',
      'work experience',
      'employment',
    ]),
    education: extractSection(text, ['education', 'academic', 'qualification']),
  }

  return sections
}

function normalizeText(text: string): string {
  const collapsed = text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Fix words that are split into spaced letters (e.g., "A V I S H E K" -> "AVISHEK")
  return collapsed.replace(/\b(?:[A-Za-z]\s+){2,}[A-Za-z]\b/g, (m) =>
    m.replace(/\s+/g, '')
  )
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const rows: Record<number, { x: number; t: string }[]> = {}

    new PdfReader().parseBuffer(buffer, (err, item) => {
      if (err) return reject(err)

      if (!item) {
        const text = Object.keys(rows)
          .map(Number)
          .sort((a, b) => a - b)
          .map((y) =>
            rows[y]
              .sort((a, b) => a.x - b.x)
              .map((r) => r.t)
              .join(' ')
          )
          .join('\n')
        return resolve(text)
      }

      if (
        item.text &&
        typeof item.y === 'number' &&
        typeof (item as any).x === 'number'
      ) {
        rows[item.y] = rows[item.y] || []
        rows[item.y].push({ x: (item as any).x, t: item.text })
      }
    })
  })
}

/**
 * Extract a section from text based on common headers
 */
function extractSection(text: string, headers: string[]): string {
  const lines = text.split('\n')
  let capturing = false
  let sectionText: string[] = []

  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim()

    // Check if this line is a section header we're looking for
    if (headers.some((h) => lowerLine.includes(h))) {
      capturing = true
      continue
    }

    // Stop capturing if we hit another major section
    if (
      capturing &&
      /^(education|experience|skills|projects|certifications)/i.test(lowerLine)
    ) {
      break
    }

    if (capturing && line.trim()) {
      sectionText.push(line.trim())
    }
  }

  return sectionText.join('\n')
}

function detectSkills(text: string): string[] {
  const lowerText = text.toLowerCase()

  const skillsDict = [
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
    'node.js',
    'express',
    'fastify',
    'django',
    'flask',
    'spring',
    'rails',
    '.net',
    'sql',
    'mysql',
    'postgresql',
    'mongodb',
    'redis',
    'elasticsearch',
    'sqlite',
    'aws',
    'azure',
    'gcp',
    'docker',
    'kubernetes',
    'jenkins',
    'github actions',
    'ci/cd',
    'git',
    'jira',
    'postman',
    'figma',
    'graphql',
    'rest api',
    'microservices',
  ]

  return skillsDict.filter((skill) => lowerText.includes(skill))
}

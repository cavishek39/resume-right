import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface ResumeUploadResponse {
  success: boolean
  resumeId: number
  filename: string
  parsedData: any
}

export interface JobSubmitResponse {
  success: boolean
  jobId: number
  extracted: {
    skills: string[]
    requirements: string[]
    yearsExperience: number | null
  }
}

export interface AnalysisResponse {
  success: boolean
  analysisId: number
  comparison: {
    matchPercentage: number
    matchedSkills: string[]
    missingSkills: string[]
    matchedRequirements: string[]
    missingRequirements: string[]
    suggestions: string[]
    strengths: string[]
    weaknesses: string[]
  }
  rewrittenResume: string | null
}

export async function uploadResume(file: File): Promise<ResumeUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/api/resume/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function submitJob(data: {
  jobUrl?: string
  jobText?: string
}): Promise<JobSubmitResponse> {
  const response = await api.post('/api/job/submit', data)
  return response.data
}

export async function fullAnalysis(data: {
  resumeId: number
  jobId: number
  rewrite?: boolean
}): Promise<AnalysisResponse> {
  const response = await api.post('/api/analyze/full', data)
  return response.data
}

export default api

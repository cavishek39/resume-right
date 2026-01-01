import axios from 'axios'

// Prefer NEXT_PUBLIC_API_URL; fall back to legacy NEXT_PUBLIC_API_BASE and then localhost
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'http://localhost:3001'

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

export interface AnalysisDetailResponse {
  id: number
  resumeId: number
  jobId: number
  comparison: AnalysisResponse['comparison']
  suggestions: string[]
  rewrittenResume: string | null
  createdAt: string
}

export interface RecentAnalysisItem {
  analysisId: number
  jobId: number
  resumeId: number
  matchPercentage: number | null
  missingSkills: string[]
  missingRequirements: string[]
  jobTitle: string | null
  company: string | null
  sourceUrl: string | null
  createdAt: string
}

export interface RecentAnalysesResponse {
  success: boolean
  items: RecentAnalysisItem[]
}

export async function uploadResume(
  file: File,
  token: string,
  signal?: AbortSignal
): Promise<ResumeUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/api/resume/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
    signal,
  })

  return response.data
}

export async function submitJob(
  data: {
    jobUrl?: string
    jobText?: string
    companyName?: string
  },
  token: string,
  signal?: AbortSignal
): Promise<JobSubmitResponse> {
  const response = await api.post('/api/job/submit', data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  })
  return response.data
}

export async function fullAnalysis(
  data: {
    resumeId: number
    jobId: number
    rewrite?: boolean
  },
  token: string,
  signal?: AbortSignal
): Promise<AnalysisResponse> {
  const response = await api.post('/api/analyze/full', data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  })
  return response.data
}

export async function fetchRecentAnalyses(
  token: string
): Promise<RecentAnalysesResponse> {
  const response = await api.get('/api/analyze/recent', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

export async function fetchAnalysisById(
  analysisId: number,
  token: string
): Promise<AnalysisDetailResponse> {
  const response = await api.get(`/api/analyze/${analysisId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

export default api

'use client'

import { useEffect, useState } from 'react'
import { FileCheck, Sparkles, AlertCircle } from 'lucide-react'
import FileUpload from '@/components/FileUpload'
import JobInput from '@/components/JobInput'
import ResultsDisplay from '@/components/ResultsDisplay'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  uploadResume,
  submitJob,
  fullAnalysis,
  AnalysisResponse,
  oneClickAuth,
} from '@/lib/api'

export default function Home() {
  const [step, setStep] = useState<
    'auth' | 'upload' | 'job' | 'analyzing' | 'results'
  >('auth')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeId, setResumeId] = useState<number | null>(null)
  const [jobId, setJobId] = useState<number | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [lastJobData, setLastJobData] = useState<{
    jobUrl?: string
    jobText?: string
  } | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')

  const progressSteps: Array<'auth' | 'upload' | 'job'> = [
    'auth',
    'upload',
    'job',
  ]

  useEffect(() => {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem('authToken')
    const storedUserId = localStorage.getItem('userId')

    if (token && storedUserId) {
      setUserId(Number(storedUserId))
      setStep('upload')
    }
  }, [])

  const handleOneClickAuth = async () => {
    setError(null)
    setLoadingMessage('Creating your session...')
    setStep('analyzing')

    try {
      const response = await oneClickAuth()
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', response.token)
        localStorage.setItem('userId', response.userId.toString())
      }
      setUserId(response.userId)
      setStep('upload')
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Failed to create session. Please try again.'
      )
      setStep('auth')
    } finally {
      setLoadingMessage('')
    }
  }

  const handleResumeUpload = async (file: File) => {
    if (!userId) {
      setError('Please sign in before uploading a resume.')
      setStep('auth')
      return
    }

    setResumeFile(file)
    setError(null)
    setLoadingMessage('Parsing your resume...')
    setStep('analyzing')

    try {
      const response = await uploadResume(file)
      setResumeId(response.resumeId)
      setStep('job')
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Failed to upload resume. Please try again.'
      )
      setStep('upload')
    }
  }

  const handleJobSubmit = async (data: {
    jobUrl?: string
    jobText?: string
  }) => {
    if (!userId) {
      setError('Please sign in before submitting a job description.')
      setStep('auth')
      return
    }

    setLastJobData(data)
    setError(null)
    setLoadingMessage(
      data.jobUrl
        ? 'Scraping job description...'
        : 'Processing job description...'
    )
    setStep('analyzing')

    try {
      const jobResponse = await submitJob(data)
      setJobId(jobResponse.jobId)

      if (resumeId) {
        setLoadingMessage(
          'Analyzing resume match and generating AI suggestions...'
        )
        const analysisResponse = await fullAnalysis({
          resumeId,
          jobId: jobResponse.jobId,
          rewrite: true,
        })
        setAnalysis(analysisResponse)
        setStep('results')
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Failed to process job description. Please try again.'
      )
      setStep('job')
    }
  }

  const handleRetry = async () => {
    if (resumeId && lastJobData) {
      // Retry job processing and analysis
      await handleJobSubmit(lastJobData)
      return
    }

    if (resumeFile) {
      // Retry resume upload
      await handleResumeUpload(resumeFile)
      return
    }

    // Nothing to retry, reset to first step
    handleReset()
  }

  const handleReset = () => {
    setResumeFile(null)
    setResumeId(null)
    setJobId(null)
    setAnalysis(null)
    setError(null)
    setStep(userId ? 'upload' : 'auth')
  }

  const currentProgressStep = () => {
    if (step === 'results') return 'job'
    if (step === 'analyzing') {
      if (!userId) return 'auth'
      if (resumeId) return 'job'
      return 'upload'
    }
    return step
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'>
      {/* Header */}
      <header className='bg-white dark:bg-gray-800 shadow-sm'>
        <div className='max-w-6xl mx-auto px-4 py-6'>
          <div className='flex items-center gap-3'>
            <Sparkles className='w-8 h-8 text-blue-600' />
            <div>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                Resume Right
              </h1>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                AI-powered resume optimization for better job matches
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-6xl mx-auto px-4 py-8'>
        {error && (
          <div className='mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3'>
            <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5' />
            <div>
              <h3 className='font-semibold text-red-800 dark:text-red-200'>
                Error
              </h3>
              <p className='text-sm text-red-700 dark:text-red-300 mt-1'>
                {error}
              </p>
              <div className='mt-3 flex gap-2'>
                <button
                  type='button'
                  onClick={handleRetry}
                  className='inline-flex items-center rounded-md bg-red-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-red-700 transition-colors'>
                  Retry
                </button>
                <button
                  type='button'
                  onClick={handleReset}
                  className='inline-flex items-center rounded-md border border-red-300 dark:border-red-700 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors'>
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'auth' && (
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8'>
            <div className='flex items-center gap-3 mb-6'>
              <div className='bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg'>
                <Sparkles className='w-6 h-6 text-indigo-600 dark:text-indigo-400' />
              </div>
              <div>
                <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                  One-click Sign In
                </h2>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  Create a private session to store your uploads securely
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={handleOneClickAuth}
              className='w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-3 text-sm font-medium hover:bg-indigo-700 transition-colors'>
              Start with one click
            </button>
          </div>
        )}

        {step === 'upload' && (
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8'>
            <div className='flex items-center gap-3 mb-6'>
              <div className='bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg'>
                <FileCheck className='w-6 h-6 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                  Step 1: Upload Your Resume
                </h2>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  We'll parse and analyze your resume
                </p>
              </div>
            </div>
            <FileUpload onFileSelect={handleResumeUpload} />
          </div>
        )}

        {step === 'job' && (
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8'>
            <div className='flex items-center gap-3 mb-6'>
              <div className='bg-green-100 dark:bg-green-900/30 p-3 rounded-lg'>
                <FileCheck className='w-6 h-6 text-green-600 dark:text-green-400' />
              </div>
              <div>
                <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                  Step 2: Add Job Description
                </h2>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  Paste the URL or full job description text
                </p>
              </div>
            </div>
            <JobInput onSubmit={handleJobSubmit} />
          </div>
        )}

        {step === 'analyzing' && (
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8'>
            <LoadingSpinner message={loadingMessage} />
          </div>
        )}

        {step === 'results' && analysis && (
          <div>
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center gap-3'>
                <div className='bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg'>
                  <Sparkles className='w-6 h-6 text-purple-600 dark:text-purple-400' />
                </div>
                <div>
                  <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    Analysis Complete
                  </h2>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Here's how you can improve your resume
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className='px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors'>
                Start Over
              </button>
            </div>
            <ResultsDisplay
              analysis={analysis.comparison}
              rewrittenResume={analysis.rewrittenResume}
            />
          </div>
        )}

        {/* Progress Indicator */}
        {step !== 'results' && (
          <div className='mt-8 flex items-center justify-center gap-3'>
            {progressSteps.map((progressStep, index) => {
              const activeIndex = progressSteps.indexOf(currentProgressStep())
              const isActive = activeIndex >= index

              return (
                <div key={progressStep} className='flex items-center gap-3'>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                  {index < progressSteps.length - 1 && (
                    <div className='w-12 h-1 bg-gray-300 dark:bg-gray-600' />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className='mt-16 pb-8 text-center text-sm text-gray-600 dark:text-gray-400'>
        <p>
          Develop with ❤️ by{' '}
          <a
            href='https://github.com/avishek87'
            target='_blank'
            rel='noreferrer'
            className='font-bold text-blue-700 dark:text-blue-300 hover:underline'>
            Avishek
          </a>
        </p>
      </footer>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useClerk, useUser } from '@clerk/nextjs'
import { FileCheck, Sparkles, AlertCircle, LogOut } from 'lucide-react'
import FileUpload from '@/components/FileUpload'
import JobInput from '@/components/JobInput'
import ResultsDisplay from '@/components/ResultsDisplay'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  uploadResume,
  submitJob,
  fullAnalysis,
  AnalysisResponse,
  fetchRecentAnalyses,
  RecentAnalysisItem,
  fetchAnalysisById,
} from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { signOut } = useClerk()
  const { user } = useUser()

  const [step, setStep] = useState<'upload' | 'job' | 'analyzing' | 'results'>(
    'upload'
  )
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeId, setResumeId] = useState<number | null>(null)
  const [jobId, setJobId] = useState<number | null>(null)
  const [lastJobData, setLastJobData] = useState<{
    jobUrl?: string
    jobText?: string
    companyName?: string
  } | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [recentOpen, setRecentOpen] = useState(false)
  const [recentLoading, setRecentLoading] = useState(false)
  const [recentError, setRecentError] = useState<string | null>(null)
  const [recentItems, setRecentItems] = useState<RecentAnalysisItem[]>([])
  const [historyOpeningId, setHistoryOpeningId] = useState<number | null>(null)
  const [analyzingContext, setAnalyzingContext] = useState<
    'upload' | 'job' | null
  >(null)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  const progressSteps: Array<'upload' | 'job'> = ['upload', 'job']

  const loadToken = useCallback(async () => {
    // Request a fresh token to avoid stale/expired cache
    const token = await getToken({ skipCache: true })
    setAuthToken(token || null)
    return token
  }, [getToken])

  const refreshRecent = useCallback(async (token: string) => {
    try {
      setRecentLoading(true)
      setRecentError(null)
      const resp = await fetchRecentAnalyses(token)
      setRecentItems(resp.items)
    } catch (err: any) {
      setRecentError(
        err?.response?.data?.error || err?.message || 'Failed to load history.'
      )
    } finally {
      setRecentLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push('/auth')
      return
    }
    void (async () => {
      const token = await loadToken()
      if (token) {
        void refreshRecent(token)
      }
    })()
  }, [isLoaded, isSignedIn, loadToken, refreshRecent, router])

  const requireAuthToken = useCallback(async () => {
    // Always fetch a fresh token to avoid using an expired cached value
    const token = await loadToken()
    if (!token) {
      throw new Error('Missing auth token. Please sign in again.')
    }
    return token
  }, [loadToken])

  const formatJobLabel = useCallback((item: RecentAnalysisItem) => {
    if (item.company) {
      return item.jobTitle ? `${item.company} • ${item.jobTitle}` : item.company
    }
    if (item.sourceUrl) {
      try {
        const host = new URL(item.sourceUrl).hostname.replace(/^www\./, '')
        return host
      } catch {
        return 'Job'
      }
    }
    return 'Company Name'
  }, [])

  const openAnalysisFromHistory = useCallback(
    async (analysisId: number) => {
      try {
        setHistoryOpeningId(analysisId)
        const token = await requireAuthToken()
        const detail = await fetchAnalysisById(analysisId, token)

        setAnalysis({
          success: true,
          analysisId: detail.id,
          comparison: detail.comparison,
          rewrittenResume: detail.rewrittenResume,
        })
        setResumeId(detail.resumeId)
        setJobId(detail.jobId)
        setError(null)
        setStep('results')
        setRecentOpen(false)
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to open analysis from history.'
        )
      } finally {
        setHistoryOpeningId(null)
      }
    },
    [requireAuthToken]
  )

  const handleResumeUpload = async (file: File) => {
    if (!isSignedIn) {
      router.push('/auth')
      return
    }

    setResumeFile(file)
    setError(null)
    setLoadingMessage('Parsing your resume...')
    setAnalyzingContext('upload')
    setStep('analyzing')

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const token = await requireAuthToken()
      const response = await uploadResume(file, token, controller.signal)
      setResumeId(response.resumeId)
      setStep('job')
      void refreshRecent(token)
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        // Cancelled by user; state already reset
        return
      }
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to upload resume. Please try again.'
      )
      setStep('upload')
    } finally {
      setLoadingMessage('')
      setAnalyzingContext(null)
      setAbortController(null)
    }
  }

  const handleJobSubmit = async (data: {
    jobUrl?: string
    jobText?: string
    companyName?: string
  }) => {
    if (!isSignedIn || !resumeId) {
      setError('Please sign in and upload a resume first.')
      router.push('/auth')
      return
    }

    setLastJobData(data)
    setError(null)
    setLoadingMessage(
      data.jobUrl
        ? 'Scraping job description...'
        : 'Processing job description...'
    )
    setAnalyzingContext('job')
    setStep('analyzing')

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const token = await requireAuthToken()
      const jobResponse = await submitJob(data, token, controller.signal)
      setJobId(jobResponse.jobId)

      setLoadingMessage(
        'Analyzing resume match and generating AI suggestions...'
      )

      // Refresh token to prevent expiry during long job scraping
      const analysisToken = await requireAuthToken()

      const analysisResponse = await fullAnalysis(
        {
          resumeId,
          jobId: jobResponse.jobId,
          rewrite: true,
        },
        analysisToken,
        controller.signal
      )
      setAnalysis(analysisResponse)
      setStep('results')
      void refreshRecent(analysisToken)
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        // Cancelled by user; state already reset
        return
      }
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to process job description. Please try again.'
      )
      setStep('job')
    } finally {
      setLoadingMessage('')
      setAnalyzingContext(null)
      setAbortController(null)
    }
  }

  const handleRetry = async () => {
    if (resumeId && lastJobData) {
      await handleJobSubmit(lastJobData)
      return
    }

    if (resumeFile) {
      await handleResumeUpload(resumeFile)
      return
    }

    handleReset()
  }

  const handleReset = () => {
    abortController?.abort()
    setResumeFile(null)
    setResumeId(null)
    setJobId(null)
    setAnalysis(null)
    setError(null)
    setStep('upload')
    setAnalyzingContext(null)
    setAbortController(null)
    void loadToken()
  }

  const handleCancelAnalyzing = () => {
    abortController?.abort()
    setLoadingMessage('')
    setAnalysis(null)
    setError(null)

    if (analyzingContext === 'job') {
      setJobId(null)
      setStep('job')
    } else {
      setResumeFile(null)
      setResumeId(null)
      setJobId(null)
      setStep('upload')
    }

    setAnalyzingContext(null)
    setAbortController(null)
  }

  const currentProgressStep = useMemo<'upload' | 'job'>(() => {
    if (step === 'results') return 'job'
    if (step === 'analyzing') {
      if (resumeId) return 'job'
      return 'upload'
    }
    return step
  }, [step, resumeId])

  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Guest'

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'>
      {/* Header */}
      <header className='sticky top-0 z-30 w-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50'>
        <div className='max-w-6xl mx-auto px-4 h-20 flex items-center justify-between gap-4'>
          <div
            className='flex items-center gap-4 group cursor-pointer'
            onClick={() => setStep('upload')}>
            <div className='bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 transform group-hover:scale-105 transition-transform duration-300'>
              <img src='/resume-right.svg' alt='Logo' className='w-7 h-7' />
            </div>
            <div>
              <h1 className='text-xl font-extrabold tracking-tight text-gray-900 dark:text-white'>
                Resume Right
              </h1>
              <p className='text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 dark:text-gray-400'>
                AI Selection Suite
              </p>
            </div>
          </div>

          {isSignedIn && (
            <div className='flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 p-1.5 rounded-[1.25rem] border border-gray-200/50 dark:border-gray-700/50 shadow-sm'>
              <div className='flex items-center gap-3 pl-3 pr-2'>
                {user?.imageUrl && (
                  <img
                    src={user.imageUrl}
                    className='w-8 h-8 rounded-full border border-white/20'
                    alt={displayName}
                  />
                )}
                <div className='hidden sm:block'>
                  <p className='text-xs font-bold text-gray-900 dark:text-gray-100 truncate max-w-[120px]'>
                    {displayName}
                  </p>
                  <p className='text-[9px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400'>
                    Free Tier
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-1.5 ml-2'>
                <button
                  onClick={() => setRecentOpen(true)}
                  className='h-8 px-4 inline-flex items-center text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200/50 dark:border-gray-600/50 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300'>
                  History
                </button>
                <button
                  onClick={() =>
                    signOut(() => {
                      setAuthToken(null)
                      router.push('/auth')
                    })
                  }
                  className='h-8 w-8 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-300'
                  title='Sign out'>
                  <LogOut className='w-4 h-4' />
                </button>
              </div>
            </div>
          )}
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
            <div className='mt-6 flex justify-center'>
              <button
                type='button'
                onClick={handleCancelAnalyzing}
                className='inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'>
                Cancel
              </button>
            </div>
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
              const activeIndex = progressSteps.indexOf(currentProgressStep)
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

      {/* History Drawer */}
      {recentOpen && (
        <div className='fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex justify-end'>
          <div className='w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl p-6 overflow-y-auto'>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  Recent Analyses
                </h3>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  Last 20 jobs you analyzed
                </p>
              </div>
              <button
                onClick={() => setRecentOpen(false)}
                className='text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'>
                Close
              </button>
            </div>

            {recentLoading && (
              <div className='py-6 text-sm text-gray-600 dark:text-gray-400'>
                Loading history...
              </div>
            )}

            {recentError && (
              <div className='mb-4 text-sm text-red-600 dark:text-red-400'>
                {recentError}
              </div>
            )}

            {!recentLoading && recentItems.length === 0 && (
              <div className='text-sm text-gray-600 dark:text-gray-400'>
                No analyses yet. Run one to see it here.
              </div>
            )}

            <div className='space-y-3'>
              {recentItems.map((item) => (
                <div
                  key={item.analysisId}
                  className='border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800'>
                  <div className='flex items-start justify-between'>
                    <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                      {item.company || formatJobLabel(item)}
                      {item.jobTitle && (
                        <div className='text-xs text-gray-600 dark:text-gray-400 font-normal'>
                          {item.jobTitle}
                        </div>
                      )}
                    </div>
                    {item.matchPercentage !== null && (
                      <span className='text-sm font-medium text-blue-600 dark:text-blue-300'>
                        {Math.round(item.matchPercentage)}%
                      </span>
                    )}
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between items-center gap-2'>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    {item.sourceUrl && !item.company && (
                      <span className='truncate max-w-[140px] text-blue-600 dark:text-blue-300'>
                        {(() => {
                          try {
                            return new URL(item.sourceUrl).hostname.replace(
                              /^www\./,
                              ''
                            )
                          } catch {
                            return item.sourceUrl
                          }
                        })()}
                      </span>
                    )}
                  </div>
                  {(item.missingSkills.length > 0 ||
                    item.missingRequirements.length > 0) && (
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {item.missingSkills.slice(0, 3).map((s, idx) => (
                        <span
                          key={`ms-${item.analysisId}-${idx}`}
                          className='px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200'>
                          Missing: {s}
                        </span>
                      ))}
                      {item.missingRequirements.slice(0, 2).map((r, idx) => (
                        <span
                          key={`mr-${item.analysisId}-${idx}`}
                          className='px-2 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200'>
                          Gap: {r}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className='mt-3 flex justify-end'>
                    <button
                      onClick={() => openAnalysisFromHistory(item.analysisId)}
                      disabled={historyOpeningId === item.analysisId}
                      className='text-sm text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                      {historyOpeningId === item.analysisId
                        ? 'Opening...'
                        : 'Open analysis'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className='mt-16 pb-8 text-center text-sm text-gray-600 dark:text-gray-400'>
        <p>
          Develop with ❤️ by{' '}
          <a
            href='https://github.com/cavishek39'
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

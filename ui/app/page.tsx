'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useClerk, useUser } from '@clerk/nextjs'
import { FileCheck, Sparkles, AlertCircle, LogOut } from 'lucide-react'
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
import FileUpload from '@/components/FileUpload'

export default function Home() {
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { signOut } = useClerk()
  const { user } = useUser()

  const [step, setStep] = useState<'upload' | 'job' | 'analyzing' | 'results'>(
    'job'
  )
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeId, setResumeId] = useState<number | null>(null)
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
      router.push('/login')
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
      router.push('/login')
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
      router.push('/login')
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
      setStep('job')
    } else {
      setResumeFile(null)
      setResumeId(null)

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
    <div className='flex flex-col min-h-screen'>
      {/* Header */}
      <header className='sticky top-0 z-30 w-full bg-white/[0.03] backdrop-blur-xl border-b border-white/10'>
        <div className='max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3'>
          <div
            className='flex items-center gap-3 group cursor-pointer'
            onClick={() => setStep('upload')}>
            <div className='bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg shadow-md shadow-blue-500/20 transform group-hover:scale-105 transition-transform duration-200'>
              <img src='/resume-right.svg' alt='Logo' className='w-5 h-5' />
            </div>
            <div>
              <h1 className='text-base font-bold tracking-tight text-white'>
                Resume Right
              </h1>
              <p className='text-[9px] uppercase tracking-wider font-medium text-gray-400'>
                AI Selection Suite
              </p>
            </div>
          </div>

          {isSignedIn && (
            <div className='flex items-center gap-1.5 bg-white/[0.05] p-1 rounded-full border border-white/10'>
              <div className='flex items-center gap-2 pl-2 pr-1'>
                {user?.imageUrl && (
                  <img
                    src={user.imageUrl}
                    className='w-6 h-6 rounded-full border border-white/20'
                    alt={displayName}
                  />
                )}
                <div className='hidden sm:block'>
                  <p className='text-[11px] font-medium text-white truncate max-w-[100px]'>
                    {displayName}
                  </p>
                  <p className='text-[8px] uppercase tracking-wider font-medium text-blue-400'>
                    Free Tier
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-1 ml-1'>
                <button
                  onClick={() => setRecentOpen(true)}
                  className='h-6 px-3 inline-flex items-center text-[10px] font-medium uppercase tracking-wide bg-white/5 text-white border border-white/10 rounded-full hover:bg-white/10 transition-all duration-200'>
                  History
                </button>
                <button
                  onClick={() =>
                    signOut(() => {
                      setAuthToken(null)
                      router.push('/login')
                    })
                  }
                  className='h-6 w-6 flex items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200'
                  title='Sign out'>
                  <LogOut className='w-3 h-3' />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className='flex-1 flex items-center justify-center px-4 py-8'>
        <div className='flex flex-col items-center w-full'>
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
            <div className='max-w-xl mx-auto w-full'>
              <div className='relative overflow-hidden bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-white/15 group'>
                {/* Top Shine Effect */}
                <div className='absolute -top-[100%] left-0 w-full h-full bg-gradient-to-b from-white/[0.03] to-transparent group-hover:top-0 transition-all duration-700 pointer-events-none' />

                <div className='flex items-center gap-3 mb-6 relative z-10'>
                  <div className='bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl'>
                    <FileCheck className='w-6 h-6 text-blue-400' />
                  </div>
                  <div>
                    <h2 className='text-lg font-bold tracking-tight text-white'>
                      Step 1: Upload Your Resume
                    </h2>
                    <p className='text-sm text-slate-400'>
                      We'll parse and analyze your career history
                    </p>
                  </div>
                </div>
                <div className='relative z-10'>
                  <FileUpload onFileSelect={handleResumeUpload} />
                </div>
              </div>
            </div>
          )}

          {step === 'job' && (
            <div className='max-w-xl mx-auto w-full'>
              <div className='relative overflow-hidden bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-white/15 group'>
                {/* Top Shine Effect */}
                <div className='absolute -top-[100%] left-0 w-full h-full bg-gradient-to-b from-white/[0.03] to-transparent group-hover:top-0 transition-all duration-700 pointer-events-none' />

                <div className='flex items-center gap-3 mb-6 relative z-10'>
                  <div className='bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl'>
                    <FileCheck className='w-6 h-6 text-indigo-400' />
                  </div>
                  <div>
                    <h2 className='text-lg font-bold tracking-tight text-white'>
                      Step 2: Add Job Description
                    </h2>
                    <p className='text-sm text-slate-400'>
                      Paste the URL or full job requirements
                    </p>
                  </div>
                </div>
                <div className='relative z-10'>
                  <JobInput onSubmit={handleJobSubmit} />
                </div>
              </div>
            </div>
          )}

          {step === 'analyzing' && (
            <div className='max-w-xl mx-auto w-full'>
              <div className='bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center'>
                <LoadingSpinner message={loadingMessage} />
                <div className='mt-6'>
                  <button
                    type='button'
                    onClick={handleCancelAnalyzing}
                    className='inline-flex items-center rounded-lg border border-white/10 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200'>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'results' && analysis && (
            <div>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-2'>
                  <div className='bg-purple-500/10 border border-purple-500/20 p-2 rounded-lg'>
                    <Sparkles className='w-4 h-4 text-purple-400' />
                  </div>
                  <div>
                    <h2 className='text-base font-semibold text-white'>
                      Analysis Complete
                    </h2>
                    <p className='text-xs text-gray-400'>
                      Here's how you can improve your resume
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className='px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg text-xs font-medium transition-all duration-200'>
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
            <div className='mt-6 flex items-center justify-center gap-3'>
              {progressSteps.map((progressStep, index) => {
                const activeIndex = progressSteps.indexOf(currentProgressStep)
                const isActive = activeIndex >= index

                return (
                  <div key={progressStep} className='flex items-center gap-3'>
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        isActive
                          ? 'bg-blue-500 shadow-sm shadow-blue-500/40'
                          : 'bg-white/10'
                      }`}
                    />
                    {index < progressSteps.length - 1 && (
                      <div
                        className={`w-10 h-0.5 rounded-full transition-all duration-300 ${
                          isActive ? 'bg-blue-500/50' : 'bg-white/5'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* History Drawer */}
      {recentOpen && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex justify-end'>
          {/* Overlay to close */}
          <div
            className='absolute inset-0'
            onClick={() => setRecentOpen(false)}
          />

          <div className='w-full max-w-md h-full bg-[#0f172a]/95 border-l border-white/10 shadow-2xl p-8 overflow-y-auto relative z-50'>
            <div className='flex items-center justify-between mb-8'>
              <div>
                <h3 className='text-xl font-bold text-white'>
                  Recent Analyses
                </h3>
                <p className='text-sm text-gray-400'>
                  Last 20 jobs you analyzed
                </p>
              </div>
              <button
                onClick={() => setRecentOpen(false)}
                className='p-2 text-gray-500 hover:text-white transition-colors'>
                Close
              </button>
            </div>

            {recentLoading && (
              <div className='py-12 flex justify-center'>
                <LoadingSpinner message='Loading history...' />
              </div>
            )}

            {recentError && (
              <div className='mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm'>
                {recentError}
              </div>
            )}

            {!recentLoading && recentItems.length === 0 && (
              <div className='py-12 text-center text-gray-500'>
                No analyses yet. Run one to see it here.
              </div>
            )}

            <div className='space-y-4'>
              {recentItems.map((item) => (
                <div
                  key={item.analysisId}
                  className='border border-white/5 rounded-2xl p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 group'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='text-sm font-bold text-white'>
                      {item.company || formatJobLabel(item)}
                      {item.jobTitle && (
                        <div className='text-xs text-gray-400 font-medium mt-0.5'>
                          {item.jobTitle}
                        </div>
                      )}
                    </div>
                    {item.matchPercentage !== null && (
                      <span className='px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20'>
                        {Math.round(item.matchPercentage)}%
                      </span>
                    )}
                  </div>
                  <div className='text-[10px] uppercase tracking-wider font-bold text-gray-500 mt-3 flex justify-between items-center gap-2'>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.sourceUrl && !item.company && (
                      <span className='truncate max-w-[140px] text-blue-400/60'>
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
                  <div className='mt-4 pt-4 border-t border-white/5 flex justify-end'>
                    <button
                      onClick={() => openAnalysisFromHistory(item.analysisId)}
                      disabled={historyOpeningId === item.analysisId}
                      className='text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50'>
                      {historyOpeningId === item.analysisId
                        ? 'Opening...'
                        : 'View Analysis →'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

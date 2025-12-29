'use client'

import {
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface AnalysisResult {
  matchPercentage: number
  matchedSkills: string[]
  missingSkills: string[]
  matchedRequirements: string[]
  missingRequirements: string[]
  suggestions: string[]
  strengths: string[]
  weaknesses: string[]
}

interface ResultsDisplayProps {
  analysis: AnalysisResult
  rewrittenResume?: string | null
}

export default function ResultsDisplay({
  analysis,
  rewrittenResume,
}: ResultsDisplayProps) {
  const getMatchColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600 dark:text-green-400'
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const downloadResume = () => {
    if (!rewrittenResume) return

    const blob = new Blob([rewrittenResume], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'optimized-resume.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className='space-y-6'>
      {/* Match Score */}
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Match Score
            </h2>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
              How well your resume matches this job
            </p>
          </div>
          <div
            className={`text-5xl font-bold ${getMatchColor(
              analysis.matchPercentage
            )}`}>
            {analysis.matchPercentage}%
          </div>
        </div>
      </div>

      {/* Skills Analysis */}
      <div className='grid md:grid-cols-2 gap-6'>
        <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg'>
          <div className='flex items-center gap-2 mb-4'>
            <CheckCircle className='w-5 h-5 text-green-600' />
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Matched Skills
            </h3>
          </div>
          <div className='flex flex-wrap gap-2'>
            {analysis.matchedSkills.map((skill, index) => (
              <span
                key={index}
                className='px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm'>
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg'>
          <div className='flex items-center gap-2 mb-4'>
            <XCircle className='w-5 h-5 text-red-600' />
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Missing Skills
            </h3>
          </div>
          <div className='flex flex-wrap gap-2'>
            {analysis.missingSkills.length > 0 ? (
              analysis.missingSkills.map((skill, index) => (
                <span
                  key={index}
                  className='px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full text-sm'>
                  {skill}
                </span>
              ))
            ) : (
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                All required skills matched!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className='grid md:grid-cols-2 gap-6'>
        <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg'>
          <div className='flex items-center gap-2 mb-4'>
            <TrendingUp className='w-5 h-5 text-blue-600' />
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Strengths
            </h3>
          </div>
          <ul className='space-y-2'>
            {analysis.strengths.map((strength, index) => (
              <li
                key={index}
                className='text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2'>
                <span className='text-blue-600 mt-1'>•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg'>
          <div className='flex items-center gap-2 mb-4'>
            <TrendingDown className='w-5 h-5 text-orange-600' />
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Areas to Improve
            </h3>
          </div>
          <ul className='space-y-2'>
            {analysis.weaknesses.map((weakness, index) => (
              <li
                key={index}
                className='text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2'>
                <span className='text-orange-600 mt-1'>•</span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Suggestions */}
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg'>
        <div className='flex items-center gap-2 mb-4'>
          <AlertCircle className='w-5 h-5 text-purple-600' />
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Actionable Suggestions
          </h3>
        </div>
        <ul className='space-y-3'>
          {analysis.suggestions.map((suggestion, index) => (
            <li
              key={index}
              className='text-sm text-gray-700 dark:text-gray-300 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg'>
              {suggestion}
            </li>
          ))}
        </ul>
      </div>

      {/* Rewritten Resume */}
      {rewrittenResume && (
        <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              AI-Optimized Resume
            </h3>
            <button
              onClick={downloadResume}
              className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors'>
              Download Markdown
            </button>
          </div>
          <div className='prose dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 p-6 rounded-lg overflow-auto max-h-96'>
            <ReactMarkdown>{rewrittenResume}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

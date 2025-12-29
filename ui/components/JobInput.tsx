'use client'

import { useState } from 'react'
import { Link, FileText, Building2 } from 'lucide-react'

interface JobInputProps {
  onSubmit: (data: {
    jobUrl?: string
    jobText?: string
    companyName?: string
  }) => void
}

export default function JobInput({ onSubmit }: JobInputProps) {
  const [inputType, setInputType] = useState<'url' | 'text'>('url')
  const [jobUrl, setJobUrl] = useState('')
  const [jobText, setJobText] = useState('')
  const [companyName, setCompanyName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputType === 'url' && jobUrl) {
      onSubmit({ jobUrl })
    } else if (inputType === 'text' && jobText && companyName.trim()) {
      onSubmit({ jobText, companyName: companyName.trim() })
    }
  }

  return (
    <div className='w-full'>
      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
        Job Description
      </label>

      <div className='flex gap-2 mb-4'>
        <button
          type='button'
          onClick={() => setInputType('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            inputType === 'url'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
          <Link className='w-4 h-4' />
          Job URL
        </button>
        <button
          type='button'
          onClick={() => setInputType('text')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            inputType === 'text'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
          <FileText className='w-4 h-4' />
          Paste Text
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {inputType === 'url' ? (
          <input
            type='url'
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder='https://linkedin.com/jobs/...'
            className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            required
          />
        ) : (
          <div className='space-y-3'>
            <div>
              <label className='flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                <Building2 className='w-4 h-4' /> Company Name (required)
              </label>
              <input
                type='text'
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder='e.g., Acme Corp'
                className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                required
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Job Description (paste text)
              </label>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder='Paste the full job description here...'
                rows={8}
                className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                required
              />
            </div>
          </div>
        )}

        <button
          type='submit'
          className='mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors'>
          Submit Job Description
        </button>
      </form>
    </div>
  )
}

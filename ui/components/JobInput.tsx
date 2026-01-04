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
    <div className='w-full max-w-2xl mx-auto'>
      <div className='flex flex-wrap gap-2 mb-5'>
        <button
          type='button'
          onClick={() => setInputType('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
            inputType === 'url'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
          }`}>
          <Link className='w-3.5 h-3.5' />
          Job URL
        </button>
        <button
          type='button'
          onClick={() => setInputType('text')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
            inputType === 'text'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
          }`}>
          <FileText className='w-3.5 h-3.5' />
          Paste Text
        </button>
      </div>

      <form onSubmit={handleSubmit} className='space-y-5'>
        {inputType === 'url' ? (
          <div className='animate-in fade-in slide-in-from-top-2 duration-300'>
            <label className='block text-[10px] font-semibold uppercase tracking-wider text-blue-400/80 mb-2'>
              Enter Job Link
            </label>
            <input
              type='url'
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder='https://www.linkedin.com/jobs/view/...'
              className='w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all text-sm'
              required
            />
          </div>
        ) : (
          <div className='space-y-4 animate-in fade-in slide-in-from-top-2 duration-300'>
            <div>
              <label className='flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-blue-400/80 mb-2'>
                <Building2 className='w-3.5 h-3.5' /> Company Name
              </label>
              <input
                type='text'
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder='e.g., Google, Tesla, Acme Corp'
                className='w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all text-sm'
                required
              />
            </div>
            <div>
              <label className='block text-[10px] font-semibold uppercase tracking-wider text-blue-400/80 mb-2'>
                Full Job Description
              </label>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder='Paste the entire job description here for the best analysis...'
                rows={8}
                className='w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all text-sm resize-none'
                required
              />
            </div>
          </div>
        )}

        <button
          type='submit'
          disabled={!companyName && inputType === 'text'}
          className='w-full group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold uppercase tracking-wide text-sm py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:grayscale disabled:translate-y-0 flex items-center justify-center gap-2'>
          Submit Job Description
          <span className='bg-white/20 p-1.5 rounded-lg group-hover:scale-105 transition-transform'>
            <FileText className='w-3.5 h-3.5' />
          </span>
        </button>
      </form>
    </div>
  )
}

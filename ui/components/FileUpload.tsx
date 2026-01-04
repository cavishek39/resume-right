'use client'

import { useState } from 'react'
import { Upload, FileText, CloudUpload } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  label?: string
}

export default function FileUpload({
  onFileSelect,
  accept = '.pdf,.docx',
  label = 'Upload Resume',
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setSelectedFile(file)
      onFileSelect(file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      onFileSelect(file)
    }
  }

  return (
    <div className='w-full'>
      <label className='block text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-3'>
        {label}
      </label>
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 group ${
          dragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}>
        <input
          type='file'
          accept={accept}
          onChange={handleChange}
          className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20'
        />
        <div className='flex flex-col items-center relative z-10'>
          {selectedFile ? (
            <div className='animate-in fade-in zoom-in duration-200'>
              <div className='bg-green-500/10 border border-green-500/20 p-3 rounded-full mb-3 mx-auto w-fit'>
                <FileText className='w-8 h-8 text-green-400' />
              </div>
              <p className='text-sm font-semibold text-white mb-0.5'>
                {selectedFile.name}
              </p>
              <p className='text-xs text-slate-400 font-medium'>
                {(selectedFile.size / 1024).toFixed(2)} KB • Ready to Analyze
              </p>
            </div>
          ) : (
            <>
              <div className='bg-white/5 border border-white/10 p-4 rounded-full mb-4 group-hover:scale-105 group-hover:bg-white/10 transition-all duration-300'>
                <CloudUpload className='w-8 h-8 text-white/50 group-hover:text-white transition-colors' />
              </div>
              <p className='text-base font-semibold text-white mb-1'>
                Drop your resume here
              </p>
              <p className='text-sm text-slate-400 max-w-xs mx-auto mb-4'>
                We accept PDF or DOCX files for the best results
              </p>
              <div className='inline-flex items-center px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-white uppercase tracking-wide group-hover:bg-blue-600 group-hover:border-transparent transition-all duration-200'>
                Browse Files
              </div>
              <p className='text-[9px] text-slate-500 mt-4 font-medium uppercase tracking-wider'>
                Maximum File Size: 5MB
              </p>
            </>
          )}
        </div>

        {/* Decorative corner accents */}
        <div className='absolute top-3 left-3 w-3 h-3 border-t border-l border-white/5 rounded-tl-sm' />
        <div className='absolute top-3 right-3 w-3 h-3 border-t border-r border-white/5 rounded-tr-sm' />
        <div className='absolute bottom-3 left-3 w-3 h-3 border-b border-l border-white/5 rounded-bl-sm' />
        <div className='absolute bottom-3 right-3 w-3 h-3 border-b border-r border-white/5 rounded-br-sm' />
      </div>
    </div>
  )
}

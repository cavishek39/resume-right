'use client'

import { useState } from 'react'
import { Upload, FileText } from 'lucide-react'

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
      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
        {label}
      </label>
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}>
        <input
          type='file'
          accept={accept}
          onChange={handleChange}
          className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
        />
        <div className='flex flex-col items-center'>
          {selectedFile ? (
            <>
              <FileText className='w-12 h-12 text-green-500 mb-3' />
              <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                {selectedFile.name}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </>
          ) : (
            <>
              <Upload className='w-12 h-12 text-gray-400 mb-3' />
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Drag and drop your resume here, or click to browse
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
                PDF or DOCX (Max 10MB)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

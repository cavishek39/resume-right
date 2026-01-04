'use client'

import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className='mt-auto py-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800/50 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm'>
      <div className='max-w-6xl mx-auto px-4'>
        <p className='flex items-center justify-center gap-1.5'>
          Developed with <span className='text-red-500 animate-pulse'>❤️</span>{' '}
          by{' '}
          <a
            href='https://github.com/cavishek39'
            target='_blank'
            rel='noreferrer'
            className='font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-all duration-300'>
            Avishek
          </a>
        </p>
        <p className='mt-2 text-[10px] uppercase tracking-[0.2em] font-bold opacity-50'>
          © {new Date().getFullYear()} Resume Right • AI Powered Selection
        </p>
      </div>
    </footer>
  )
}

export default Footer

'use client'

import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className='mt-auto py-6 text-center text-sm text-slate-400 border-t border-white/10 bg-slate-900/50 backdrop-blur-sm'>
      <div className='max-w-6xl mx-auto px-4'>
        <p className='flex items-center justify-center gap-1.5'>
          Developed with <span className='text-red-500 animate-pulse'>❤️</span>{' '}
          by{' '}
          <a
            href='https://github.com/cavishek39'
            target='_blank'
            rel='noreferrer'
            className='font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition-all duration-300'>
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

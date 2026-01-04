import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Resume Right',
  description: 'AI-powered resume tailoring and job match analysis',
  icons: {
    icon: '/resume-right.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang='en' suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-[#0f172a] text-gray-100 relative overflow-x-hidden`}
          suppressHydrationWarning>
          {/* Global Dynamic Background Decorations */}
          <div className='fixed inset-0 pointer-events-none overflow-hidden z-0'>
            <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse' />
            <div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]' />
          </div>

          <main className='flex-grow relative z-10'>{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  )
}

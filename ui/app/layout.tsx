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
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
          <main className='flex-grow'>{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  )
}

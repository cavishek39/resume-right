'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useSignIn, useSignUp, useClerk } from '@clerk/nextjs'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  UserPlus,
  LogIn,
  ShieldCheck,
  KeyRound,
} from 'lucide-react'

const errorMessage = (err: unknown): string => {
  if (!err) return 'Something went wrong. Please try again.'
  const anyErr = err as any
  if (
    anyErr.errors &&
    Array.isArray(anyErr.errors) &&
    anyErr.errors[0]?.longMessage
  ) {
    return anyErr.errors[0].longMessage
  }
  if (anyErr.message) return anyErr.message
  return 'Something went wrong. Please try again.'
}

export default function AuthPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { setActive } = useClerk()
  const { isLoaded: signInLoaded, signIn } = useSignIn()
  const { isLoaded: signUpLoaded, signUp } = useSignUp()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoaded) return
    if (isSignedIn) router.replace('/')
  }, [authLoaded, isSignedIn, router])

  const ready = useMemo(() => {
    if (mode === 'signin') return signInLoaded
    return signUpLoaded
  }, [mode, signInLoaded, signUpLoaded])

  const handleGoogle = async () => {
    if (!signInLoaded || !signIn) return
    setError(null)
    setLoading(true)
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      })
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signInLoaded || !signIn) return
    setError(null)
    setLoading(true)
    try {
      const result = await signIn.create({ identifier: email, password })

      if (result.status === 'complete') {
        await setActive?.({ session: result.createdSessionId })
        router.push('/')
        return
      }

      if (result.status === 'needs_first_factor') {
        setError(
          'Additional verification required. Please try Google or email code.'
        )
        return
      }

      setError('Unable to sign in. Please try again.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const startSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUpLoaded || !signUp) return
    setError(null)
    setLoading(true)
    try {
      await signUp.create({ emailAddress: email, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const completeSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUpLoaded || !signUp) return
    setError(null)
    setLoading(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      })
      if (result.status === 'complete') {
        await setActive?.({ session: result.createdSessionId })
        router.push('/')
        return
      }
      setError('Invalid code. Please try again.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#0f172a] relative overflow-hidden flex items-center justify-center px-4 py-12'>
      {/* Dynamic Background Decorations */}
      <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse' />
      <div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]' />

      <div className='max-w-xl w-full relative z-10'>
        <div className='bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-500 hover:border-white/20 group'>
          {/* Top Shine Effect */}
          <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent' />

          <div className='flex items-center gap-5 mb-8'>
            <div className='bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-white/10 rounded-2xl p-4 shadow-inner transform transition-transform group-hover:scale-110 duration-500'>
              <img src='/resume-right.svg' alt='Logo' className='w-8 h-8' />
            </div>
            <div>
              <h1 className='text-3xl font-bold tracking-tight text-white'>
                Resume Right
              </h1>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3 mb-8 bg-white/[0.02] p-1.5 rounded-2xl border border-white/5'>
            <button
              onClick={() => {
                setMode('signin')
                setError(null)
                setPendingVerification(false)
              }}
              className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-[0_4px_12px_rgba(255,255,255,0.2)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
              <LogIn className='w-4 h-4' />
              Sign in
            </button>
            <button
              onClick={() => {
                setMode('signup')
                setError(null)
                setPendingVerification(false)
              }}
              className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-[0_4px_12px_rgba(255,255,255,0.2)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
              <UserPlus className='w-4 h-4' />
              Sign up
            </button>
          </div>

          <button
            type='button'
            disabled={!ready || loading}
            onClick={handleGoogle}
            className='w-full inline-flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-3.5 rounded-xl shadow-lg hover:shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-60'>
            {loading ? (
              <Loader2 className='w-5 h-5 animate-spin' />
            ) : (
              <Sparkles className='w-5 h-5 text-indigo-600' />
            )}
            Continue with Google
          </button>

          <div className='relative my-10'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-white/10' />
            </div>
            <div className='relative flex justify-center text-xs uppercase tracking-[0.2em] font-bold'>
              <span className='px-4 text-white/40 bg-[#161d31] rounded-full py-1 border border-white/5'>
                OR EMAIL
              </span>
            </div>
          </div>

          {!pendingVerification && (
            <form
              onSubmit={mode === 'signin' ? handleSignIn : startSignUp}
              className='space-y-5'>
              <div className='space-y-2.5'>
                <label className='text-xs font-bold text-indigo-200/60 uppercase tracking-widest flex items-center gap-2 ml-1'>
                  <Mail className='w-3.5 h-3.5' /> Email Address
                </label>
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className='w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300'
                  placeholder='you@example.com'
                />
              </div>

              <div className='space-y-2.5'>
                <label className='text-xs font-bold text-indigo-200/60 uppercase tracking-widest flex items-center gap-2 ml-1'>
                  <Lock className='w-3.5 h-3.5' /> Password
                </label>
                <input
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className='w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300'
                  placeholder='••••••••'
                />
                {mode === 'signup' && (
                  <p className='text-xs text-indigo-200/40 flex items-center gap-2 ml-1'>
                    <ShieldCheck className='w-3.5 h-3.5' /> Min 8 chars, with
                    numbers & letters
                  </p>
                )}
              </div>

              <button
                type='submit'
                disabled={!ready || loading}
                className='w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-3.5 transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60'>
                {loading ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : (
                  <ArrowRight className='w-5 h-5' />
                )}
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          )}

          {pendingVerification && (
            <form onSubmit={completeSignUp} className='space-y-4'>
              <div className='flex items-center gap-2 text-sm text-white/80'>
                <KeyRound className='w-4 h-4' /> Enter the 6-digit code sent to{' '}
                {email}
              </div>
              <input
                type='text'
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                maxLength={6}
                className='w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/50 text-center tracking-[0.3em] text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400'
                placeholder='123456'
              />
              <button
                type='submit'
                disabled={!ready || loading}
                className='w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 transition disabled:opacity-60'>
                {loading ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <CheckCircle className='w-4 h-4' />
                )}
                Verify & continue
              </button>
              <p className='text-xs text-white/60 text-center'>
                Didn't get a code? Check spam or resend after 30s.
              </p>
            </form>
          )}

          {error && (
            <div className='mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/40 text-red-100 px-3 py-3 text-sm'>
              <AlertCircle className='w-4 h-4' />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

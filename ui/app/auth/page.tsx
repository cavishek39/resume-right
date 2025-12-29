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
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white flex items-center justify-center px-4 py-12'>
      <div className='max-w-xl w-full'>
        <div className='bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur'>
          <div className='flex items-center gap-3 mb-6'>
            <div className='bg-indigo-500/20 border border-indigo-400/40 rounded-xl p-3'>
              <Sparkles className='w-7 h-7 text-indigo-200' />
            </div>
            <div>
              <p className='text-sm uppercase tracking-wide text-indigo-200'>
                Secure Access
              </p>
              <h1 className='text-2xl font-semibold text-white'>
                Sign in to Resume Right
              </h1>
              <p className='text-sm text-indigo-100/80 mt-1'>
                Continue with Google or email. Custom UI, Clerk-secured, no
                surprises.
              </p>
            </div>
          </div>

          <div className='flex gap-2 mb-6'>
            <button
              onClick={() => {
                setMode('signin')
                setError(null)
                setPendingVerification(false)
              }}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                mode === 'signin'
                  ? 'bg-white text-slate-900'
                  : 'bg-white/10 text-white'
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
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-slate-900'
                  : 'bg-white/10 text-white'
              }`}>
              <UserPlus className='w-4 h-4' />
              Create account
            </button>
          </div>

          <button
            type='button'
            disabled={!ready || loading}
            onClick={handleGoogle}
            className='w-full inline-flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold py-3 rounded-xl shadow hover:shadow-md transition disabled:opacity-60'>
            {loading ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Sparkles className='w-4 h-4' />
            )}
            Continue with Google
          </button>

          <div className='relative my-6'>
            <div className='border-t border-white/10' />
            <p className='absolute -top-3 left-1/2 -translate-x-1/2 px-3 text-xs uppercase tracking-[0.2em] text-white/60 bg-slate-900'>
              or email
            </p>
          </div>

          {!pendingVerification && (
            <form
              onSubmit={mode === 'signin' ? handleSignIn : startSignUp}
              className='space-y-4'>
              <div className='space-y-2'>
                <label className='text-sm text-white/80 flex items-center gap-2'>
                  <Mail className='w-4 h-4' /> Email
                </label>
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className='w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400'
                  placeholder='you@example.com'
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm text-white/80 flex items-center gap-2'>
                  <Lock className='w-4 h-4' /> Password
                </label>
                <input
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className='w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400'
                  placeholder='••••••••'
                />
                {mode === 'signup' && (
                  <p className='text-xs text-white/60 flex items-center gap-2'>
                    <ShieldCheck className='w-4 h-4' /> Min 8 chars, with
                    numbers & letters
                  </p>
                )}
              </div>

              <button
                type='submit'
                disabled={!ready || loading}
                className='w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 transition disabled:opacity-60'>
                {loading ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <ArrowRight className='w-4 h-4' />
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

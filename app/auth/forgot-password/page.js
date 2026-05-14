'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import { api } from '../../../lib/api'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState('request') // request | verify | reset
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email: String(email || '').trim().toLowerCase() })
      if (res.data?.challengeToken) {
        setChallengeToken(res.data.challengeToken)
        setMaskedEmail(res.data.maskedEmail || email)
        setStep('verify')
        toast.success('OTP sent to your email')
      } else {
        toast.success(res.data?.message || 'If the account exists, OTP has been sent.')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/verify-reset-otp', {
        challengeToken,
        otp: String(otp || '').trim()
      })
      setResetToken(res.data?.resetToken || '')
      setStep('reset')
      toast.success('OTP verified')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!challengeToken) return
    try {
      const res = await api.post('/auth/resend-reset-otp', { challengeToken })
      setChallengeToken(res.data?.challengeToken || challengeToken)
      setMaskedEmail(res.data?.maskedEmail || maskedEmail)
      toast.success('OTP resent')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token: resetToken, password: newPassword })
      toast.success('Password reset successfully')
      router.push('/auth/login')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-logo-beige">
      <Header />
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center">
              <Image src="/NovaKeys.png" alt="NOVA KEYS Real Estate" width={48} height={48} className="object-contain" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Forgot Password</h2>
            <p className="mt-2 text-sm text-gray-600">
              {step === 'request' && 'Enter your email to receive OTP'}
              {step === 'verify' && `Enter OTP sent to ${maskedEmail || email}`}
              {step === 'reset' && 'Set your new password'}
            </p>
          </div>

          <form
            className="mt-8 space-y-6 bg-logo-white p-8 rounded-xl shadow-lg"
            onSubmit={step === 'request' ? handleRequestOtp : step === 'verify' ? handleVerifyOtp : handleResetPassword}
          >
            {step === 'request' && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {step === 'verify' && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">OTP</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button type="button" onClick={handleResendOtp} className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-500">
                  Resend OTP
                </button>
              </div>
            )}

            {step === 'reset' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : step === 'request' ? 'Send OTP' : step === 'verify' ? 'Verify OTP' : 'Reset Password'}
              </button>
            </div>

            <div className="text-center">
              <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500 text-sm">
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}
